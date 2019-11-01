// redux but with instances
import {
  Store,
  Reducer,
  Action,
  Dispatch,
  StoreEnhancer,
  createStore,
  DeepPartial
} from 'redux';
import { v4 as uuid } from 'uuid';

/** instance storage thing */
export const instanceStore: WeakMap<Store, StoreNamespaceManager> = new WeakMap();

/* uncomment when typescript supports symbols as index
interface NamespaceContainer {
  // @ts-ignore
  _types: { [x: symbol]: string };
  // @ts-ignore
  [x: symbol]: any;
}
*/
type NamespaceContainer = any;

interface NamespacedAction extends Action<string> {
  namespace: symbol;
  [x: string]: any;
}

/** represents a thing */
export class StoreNamespaceManager {
  public typeRegistry: Map<string, ReduxType> = new Map();
  public store?: Store;

  static createStore<S, A extends Action, Ext = {}, StateExt = never>(
    reducer: Reducer<S, A>,
    preloadedState?: DeepPartial<S> | StoreEnhancer<Ext, StateExt>,
    enhancer?: StoreEnhancer<Ext, StateExt>
  ): Store<S, A> {
    let instance = new StoreNamespaceManager(reducer);
    let realPreloadState: DeepPartial<S> | undefined;
    if (typeof preloadedState === 'function' && typeof enhancer === 'undefined') {
      enhancer = preloadedState as StoreEnhancer<Ext, StateExt>;
      realPreloadState = undefined;
    } else realPreloadState = preloadedState as DeepPartial<S>;
    let store = createStore<S, A, Ext, StateExt>(instance.reducer.bind(instance), realPreloadState, enhancer);
    instance.setStore(store);
    return store;
  }

  /**
   * The constructor
   * @param originalReducer Provided reducer for non-namespaced objects
   */
  constructor(private originalReducer: Reducer<any, any>) {}

  /**
   * Set the store associated with this instance
   * @param store
   */
  public setStore(store: Store<any, any>): void {
    this.store = store;
    instanceStore.set(store, this);
  }

  /**
   * The new reducer to be passed to createStore
   * @param state
   * @param action
   */
  public reducer(state: any, action: any): any {
    // if the action is handled then further reducers are not called to prevent
    // action type collisions
    switch (action.type) {
      case 'NAMESPACE_CREATE': {
        let act = action as NamespaceCreateAction;
        let type = this.typeRegistry.get(act.object);
        if (!type) throw new Error('requested type does not exist');
        let namespaceKey = act.namespace;
        let nsState: any = {};
        if (typeof act.initialState !== 'undefined') nsState = act.initialState;
        else if (typeof type.initialState !== 'undefined') nsState = type.initialState;
        // if namespaced state doesn't exist, create it
        if (!state.namespaced) {
          return {
            ...state,
            namespaced: {
              _types: { [namespaceKey]: type.name },
              [namespaceKey]: nsState
            }
          };
        }
        return {
          ...state,
          namespaced: {
            ...state.namespaced,
            _types: {
              ...state.namespaced._types,
              [namespaceKey]: type.name
            },
            [act.namespace]: nsState
          }
        };
      }
      case 'NAMESPACE_DELETE': {
        let act = action as NamespaceDeleteAction;
        let namespaceKey = act.namespace;
        let namespaced: NamespaceContainer = { ...state.namespaced };
        if (typeof namespaced[namespaceKey] === 'undefined') {
          throw new Error('No such namespace ' + namespaceKey.toString());
        }
        let nsTypes = { ...namespaced._types };
        delete nsTypes[namespaceKey];
        namespaced._types = nsTypes;
        delete namespaced[namespaceKey];
        return {
          ...state,
          namespaced
        };
      }
    }
    // if nothing to do, then call original reducer
    if (!action.namespace) return this.originalReducer(state, action);

    let act = action as NamespacedAction;
    let namespaced: NamespaceContainer = state.namespaced;
    let namespaceKey = act.namespace;
    let namespace = namespaced[namespaceKey];
    if (typeof namespace === 'undefined') {
      throw new Error('No such namespace ' + namespaceKey.toString());
    }
    let type = this.typeRegistry.get(namespaced._types[namespaceKey]);
    if (!type) throw new Error('Unknown type for already existing object');
    let newNamespace = type.reducer(namespace, action);
    return {
      ...state,
      namespaced: {
        ...state.namespaced,
        [namespaceKey]: newNamespace
      }
    };
  }

  /**
   * Register a new type
   * @param object
   */
  public registerType(object: ReduxType): void {
    if (this.typeRegistry.has(object.name)) throw new Error('Type already exists');
    this.typeRegistry.set(object.name, object);
  }
}

export interface ReduxType {
  reducer: Reducer;
  name: string;
  initialState?: any;
}

// actions

export interface NamespaceCreateAction extends Action<string> {
  type: 'NAMESPACE_CREATE';
  object: string;
  namespace: symbol;
  initialState?: any;
}

export interface NamespaceDeleteAction extends Action<string> {
  type: 'NAMESPACE_DELETE';
  namespace: symbol;
}

/**
 * Create an action to create a new namespace
 * @param object Type of anythe namespace to create
 */
export function createNamespace(object: string, initialState?: any): NamespaceCreateAction {
  let sym = Symbol(object + '/' + uuid());
  return {
    type: 'NAMESPACE_CREATE',
    object,
    namespace: sym,
    initialState
  };
}

/**
 * Create an action to delete a namespace
 * @param namespace
 */
export function deleteNamespace(namespace: symbol): NamespaceDeleteAction {
  return { type: 'NAMESPACE_DELETE', namespace };
}

/**
 * Wrap a dispatch function with a namespace
 * @param dispatch Original dispatch function
 * @param namespace Namespace to use
 */
export function bindDispatch<A extends Action>(dispatch: Dispatch<A>, namespace: symbol) {
  return function namespacedDispatch<T extends A>(action: T): T {
    return dispatch({
      ...action,
      namespace
    });
  };
}

/**
 * Register a new type based on store
 * @param store
 * @param type
 */
export function registerType(store: Store, type: ReduxType): void {
  let nsManager = instanceStore.get(store);
  if (!nsManager) throw new Error('No associated manager found for store');
  nsManager.registerType(type);
}
