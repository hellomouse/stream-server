// redux but with instances
import {
  Store,
  Reducer,
  Action,
  Dispatch,
  ActionCreator,
  StoreCreator,
  MiddlewareAPI,
  Middleware,
  compose
} from 'redux';
import { v4 as uuid } from 'uuid';

/** instance storage thing */
export const instanceStore: WeakMap<Store, NamespaceContainer> = new WeakMap();

/* uncomment when typescript supports symbols as index
interface NamespaceContainer {
  // @ts-ignore
  _types: { [x: symbol]: string };
  // @ts-ignore
  [x: symbol]: any;
}
*/
type StoreNamespaces = any;

interface NamespacedAction extends Action<string> {
  namespace: symbol;
  [x: string]: any;
}

/** represents a thing */
export class NamespaceContainer {
  public static NAMESPACED_STATE = {
    _types: {},
    _refs: {}
  };
  public typeRegistry: Map<string, ReduxType> = new Map();
  public store?: Store;
  private originalReducer?: Reducer<any, any>;

  /*
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
  */

  public enhancer(
    createStore: StoreCreator
  ): (reducer: Reducer, ...args: any[]) => Store {
    return (reducer, ...args) => {
      this.originalReducer = reducer;
      let store: Store = createStore(this.reducer.bind(this), ...args);
      let dispatch: Dispatch = this.makeDispatch(store.dispatch, store.getState);
      let newStore = {
        ...store,
        dispatch
      };
      return newStore;
    };
  }

  /**
   * Set the store associated with this instance
   * @param store
   */
  public setStore(store: Store<any, any>): void {
    this.store = store;
    instanceStore.set(store, this);
  }

  public makeDispatch(originalDispatch: Dispatch, getState: () => any): Dispatch {
    return <A extends Action>(action_: A): A => {
      let action = action_ as A & { namespace?: symbol };
      if (!action.namespace || action.type.startsWith('NAMESPACE_')) {
        return originalDispatch(action);
      }
      let namespaceKey = action.namespace;
      let type = this.typeRegistry.get(getState().namespaced._types[namespaceKey]);
      if (!type) throw new Error('invalid type in state');
      if (!type.middleware) return originalDispatch(action);

      let dispatch: Dispatch = () => {
        throw new Error('Dispatching while constructing middleware is not allowed');
      };
      let api: MiddlewareAPI = {
        getState,
        dispatch: (action, ...args) => dispatch(action, ...args)
      };
      let chain = type.middleware.map(m => m(api));
      dispatch = compose<Dispatch>(...chain)(bindDispatch(originalDispatch, namespaceKey));
      return dispatch(action);
    };
  }

  private static deleteNamespace(state: any, namespaceKey: symbol): any {
    let namespaced: StoreNamespaces = state.namespaced;
    if (typeof namespaced[namespaceKey] === 'undefined') {
      throw new Error('No such namespace ' + namespaceKey.toString());
    }
    let nsTypes = { ...namespaced._types };
    delete nsTypes[namespaceKey];
    let nsRefs = { ...namespaced._refs };
    delete nsRefs[namespaceKey];
    namespaced = {
      ...namespaced,
      _types: nsTypes,
      _refs: nsRefs
    };
    delete namespaced[namespaceKey];
    return {
      ...state,
      namespaced
    };
  }

  /**
   * The new reducer to be passed to createStore
   * @param state
   * @param action
   */
  public reducer(state: any, action: any): any {
    if (!this.originalReducer) throw new Error('original reducer not present');
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
        return {
          ...state,
          namespaced: {
            ...state.namespaced,
            _types: { ...state.namespaced._types, [namespaceKey]: type.name },
            _refs: { ...state.namespaced._refs, [namespaceKey]: act.refs },
            [act.namespace]: nsState
          }
        };
      }
      case 'NAMESPACE_REF': {
        let act = action as NamespaceRefAction;
        let namespaceKey = act.namespace;
        return {
          ...state,
          namespaced: {
            ...state.namespaced,
            _refs: {
              ...state.namespaced._refs,
              [namespaceKey]: [...state.namespaced._refs[namespaceKey], act.ref]
            }
          }
        };
      }
      case 'NAMESPACE_UNREF': {
        let act = action as NamespaceUnrefAction;
        let namespaceKey = act.namespace;
        let newRefs = state.namespaced._refs[namespaceKey]
          .filter((ref: RefType) => ref !== act.ref);
        if (newRefs.length) {
          return {
            ...state,
            namespaced: {
              ...state.namespaced,
              _refs: {
                ...state.namespaced._refs,
                [namespaceKey]: newRefs
              }
            }
          };
        } else {
          return NamespaceContainer.deleteNamespace(state, act.namespace);
        }
      }
      case 'NAMESPACE_DELETE': {
        let act = action as NamespaceDeleteAction;
        return NamespaceContainer.deleteNamespace(state, act.namespace);
      }
    }
    // if nothing to do, then call original reducer
    if (!action.namespace) return this.originalReducer(state, action);

    let act = action as NamespacedAction;
    let namespaced: StoreNamespaces = state.namespaced;
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

type RefType = string | symbol;

export interface ReduxType {
  reducer: Reducer;
  name: string;
  initialState?: any;
  actions?: { [x: string]: ActionCreator<Action> };
  middleware?: Middleware[];
  onDelete?: (state: any) => void;
}

// actions

export interface NamespaceCreateAction extends Action<string> {
  type: 'NAMESPACE_CREATE';
  object: string;
  namespace: symbol;
  initialState?: any;
  refs: RefType[];
}

/**
 * Note on namespace references
 * This module implements basic reference-counting on namespaces to keep track
 * of everything that currently depends on the namespace. This allows multiple
 * indirect references to the namespace without the namespace being unexpectedly
 * deleted. Any object that depends on the namespace should use a symbol or
 * string describing themselves as a ref, and attach it to the namespace using
 * NAMESPACE_REF. If a namespace is used by another namespace, the ref should be
 * the symbol of the owner namespace. Cleanup of the object should detach the
 * ref using NAMESPACE_DEREF. When a namespace has no more references, it will
 * be automatically deleted.
 */
export interface NamespaceRefAction extends Action<string> {
  type: 'NAMESPACE_REF';
  namespace: symbol;
  ref: RefType;
}

export interface NamespaceUnrefAction extends Action<string> {
  type: 'NAMESPACE_UNREF';
  namespace: symbol;
  ref: RefType;
}

export interface NamespaceDeleteAction extends Action<string> {
  type: 'NAMESPACE_DELETE';
  namespace: symbol;
}

/**
 * Create an action to create a new namespace
 * @param object Type of anythe namespace to create
 * @param refs List of references to have
 */
export function createNamespace(
  object: string, refs: RefType[] | RefType, initialState?: any
): NamespaceCreateAction {
  let sym = Symbol(object + '/' + uuid());
  if (!(refs instanceof Array)) refs = [refs];
  return {
    type: 'NAMESPACE_CREATE',
    object,
    namespace: sym,
    refs,
    initialState
  };
}

/**
 * Create a new reference to a namespace
 * @param namespace
 * @param ref
 */
export function refNamespace(namespace: symbol, ref: RefType) {
  return {
    type: 'NAMESPACE_REF',
    namespace,
    ref
  };
}

/**
 * Remove a reference to a namespace, and delete the namespace if it has no more references
 * @param namespace
 * @param ref
 */
export function unrefNamespace(namespace: symbol, ref: RefType) {
  return {
    type: 'NAMESPACE_UNREF',
    namespace,
    ref
  };
}

/**
 * Create an action to delete a namespace
 * This should generally not be used, use unrefNamespace for safe deletion
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
export function bindDispatch(dispatch: Dispatch, namespace: symbol) {
  return function namespacedDispatch<T extends Action>(action: T): T {
    return dispatch({
      namespace,
      ...action
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

export function registerTypes(store: Store, types: ReduxType[]): void {
  for (let type of types) registerType(store, type);
}
