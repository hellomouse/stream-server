import * as React from 'react';
import {
  ReactReduxContext,
  useSelector,
  useDispatch
} from 'react-redux';
import { Store, Dispatch } from 'redux';
import {
  createNamespace,
  refNamespace,
  unrefNamespace,
  bindDispatch
} from './redux-instance';
import { v4 as uuid } from 'uuid';

export interface ReduxNamespaceContextValue {
  namespace: symbol | null;
}

export const ReduxNamespaceContext = React.createContext<ReduxNamespaceContextValue>({
  namespace: null
});

interface InstanceProviderProps {
  /** Object type to use */
  type: string;
  /** A function to be called with the namespace */
  children: React.ReactNode;
  /** Namespace to use, if not provided, one will be created */
  namespace?: symbol;
  /** Initial state of the namespace, if any */
  initialState?: any;
  /** Callback fired with namespace key after the component is mounted */
  onNamespaceCreated?: (namespace: symbol) => void;
  /** Store if it was not provided via a react-redux Provider */
  store?: Store;
}
export class NamespaceProvider extends React.Component<InstanceProviderProps> {
  static contextType = ReactReduxContext;
  private namespace: symbol;
  private store: Store;
  private shouldDeleteNamespace = false;
  private ref = Symbol(`NamespaceProvider/${uuid()}`);

  constructor(props: InstanceProviderProps, context: any) {
    super(props, context);
    let store: Store;
    if (props.store) store = props.store;
    else if (this.context && this.context.store) store = this.context.store;
    else throw new Error('Could not find a redux store and none was provided');
    this.store = store;

    if (!props.namespace) {
      let action = createNamespace(props.type, this.ref, props.initialState);
      this.namespace = action.namespace;
      store.dispatch(action);
      this.shouldDeleteNamespace = true;
    } else this.namespace = props.namespace;
    if (this.props.onNamespaceCreated) this.props.onNamespaceCreated(this.namespace);
  }

  componentWillUnmount(): void {
    if (this.shouldDeleteNamespace) {
      this.store.dispatch(unrefNamespace(this.namespace, this.ref));
    }
  }

  render() {
    return <ReduxNamespaceContext.Provider value={{
      ...this.context,
      namespace: this.namespace
    }}>
      {this.props.children}
    </ReduxNamespaceContext.Provider>;
  }
}

/**
 * A hook to bind a functional component to a namespace
 * @param namespace Optional provided namespace
 * @return The namespace from context
 */
export function useNamespace(namespace?: symbol) {
  let context: ReduxNamespaceContextValue = React.useContext(ReduxNamespaceContext);
  let dispatch = useDispatch();
  let maybeNamespace = namespace || context.namespace;
  if (!maybeNamespace) throw new Error('No namespace given or found in context');
  let resolvedNamespace = maybeNamespace;
  React.useEffect(() => {
    let reference = Symbol(`ReactComponent/${uuid()}`);
    dispatch(refNamespace(resolvedNamespace, reference));
    return () => {
      dispatch(unrefNamespace(resolvedNamespace, reference));
    };
    // dispatch is expected to never change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context.namespace, namespace]);
  return resolvedNamespace;
}

/**
 * A hook to get a namespaced dispatch function
 * @param namespace
 */
export function useNamespacedDispatch(namespace: symbol): Dispatch {
  return bindDispatch(useDispatch(), namespace);
}

/**
 * A hook to get namespaced state
 * @param namespace
 * @param fn An optional function to get only a part of the state
 */
export function useNamespacedState(namespace: symbol, fn?: (state: any) => any): any {
  return useSelector(state => {
    let namespacedState = (state as any).namespaced[namespace];
    return fn ? fn(namespacedState) : namespacedState;
  });
}

/* all of this is gone and unnecessary
export function wrapState<
  TStateProps, TOwnProps extends { namespace?: symbol }
>(
  inner: (state: any, props: TOwnProps) => TStateProps
): (state: any, props: TOwnProps) => TStateProps {
  return function wrappedMapStateToProps(state: any, props: TOwnProps): TStateProps {
    return inner(state.namespaced[props.namespace], props);
  };
}

export function wrapDispatch<
  TDispatchProps, TOwnProps extends { namespace?: symbol }, A extends Action = AnyAction
>(
  inner: (dispatch: Dispatch<A>, props: TOwnProps) => TDispatchProps
): (dispatch: Dispatch<A>, props: TOwnProps) => TDispatchProps {
  return function wrappedMapDispatchToProps(dispatch: Dispatch<A>, props: TOwnProps): TDispatchProps {
    return inner(bindDispatch<A>(dispatch, props.namespace), props);
  };
}

/**
 * Isolate the useContext hook black magic from the other stuff
 * @param fn
 * /
function blackMagicQuarantineBox<T>(fn: () => T): T {
  try {
    return fn();
  } catch (err) {
    console.error(`connectNamespace() react hook useContext failed`);
    // @ts-ignore
    // eslint-disable-next-line
    // this is purely for debugging purposes and really should not even exist
    // please don't fire me i don't even have a job
    console.log('dispatcher value:',
      React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher.current);
    throw err;
  }
}

/**
 * A wrapped connect() that automatically applies the namespace
 * @param mapStateToProps
 * @param mapDispatchToProps
 * /
export function connectNamespace<
  TStateProps = {}, TDispatchProps = {}, TOwnProps extends { namespace?: symbol } = {}, TMergedProps = {}
>(
  mapStateToProps: (state: any, props: TOwnProps) => TStateProps,
  mapDispatchToProps: (dispatch: Dispatch<Action>, props: TOwnProps) => TDispatchProps,
  mergeProps?: (stateProps: TStateProps, dispatchProps: TDispatchProps, ownProps: TOwnProps) => TMergedProps,
  options?: ConnectOptions
): InferableComponentEnhancerWithProps<TStateProps & TDispatchProps, TOwnProps> {
  // let lastSucceededProps: TStateProps | null = null;
  // let context: ReduxNamespaceContextValue;
  // XXX FIXME: This is a bunch of *really* weird crap to get context even though react-redux
  // does not expose it. It is technically safe (so far) as connect() ends up calling these
  // functions from a functional component where it is safe to use useContext. React will
  // still log a warning about the hook not being called from the top level, however useContext
  // should be safe from the problems described.
  // useContext is intentionally called only once to prevent further errors.
  /* eslint-disable react-hooks/rules-of-hooks * /
  function wrappedMapStateToProps(state: any, props: TOwnProps): TStateProps {
    // if (!context) context = blackMagicQuarantineBox(() => React.useContext(ReduxNamespaceContext));
    let context: ReduxNamespaceContextValue = blackMagicQuarantineBox(() => React.useContext(ReduxNamespaceContext));
    let namespace: symbol = props.namespace || context.namespace;
    let nsState = state.namespaced[namespace];
    return mapStateToProps(nsState, props);
  }
  function wrappedMapDispatchToProps(dispatch: Dispatch<Action>, props: TOwnProps): TDispatchProps {
    // if (!context) context = blackMagicQuarantineBox(() => React.useContext(ReduxNamespaceContext));
    let context: ReduxNamespaceContextValue = blackMagicQuarantineBox(() => React.useContext(ReduxNamespaceContext));
    let namespace: symbol = props.namespace || context.namespace;
    let boundDispatch: Dispatch<Action> = bindDispatch(dispatch, namespace);
    return mapDispatchToProps(boundDispatch, props);
  }
  /* eslint-enable react-hooks/rules-of-hooks * /
  // yes, the exact same thing occurs on both branches of this if statement
  // blame type definitions
  if (mergeProps) {
    return connect<TStateProps, TDispatchProps, TOwnProps>(
      wrappedMapStateToProps,
      wrappedMapDispatchToProps,
      mergeProps,
      { ...options, context: ReactReduxContext }
    );
  } else {
    return connect<TStateProps, TDispatchProps, TOwnProps>(
      wrappedMapStateToProps,
      wrappedMapDispatchToProps,
      mergeProps,
      { ...options, context: ReactReduxContext, pure: false }
    );
  }
}
*/
