import * as React from 'react';
import { ReactReduxContext } from 'react-redux';
import { Store, Dispatch, Action, AnyAction } from 'redux';
import { createNamespace, deleteNamespace, bindDispatch } from './redux-instance';

interface InstanceProviderProps {
  /** Object type to create */
  type: string;
  /** A function to be called with the namespace */
  children: (namespace: symbol) => React.ReactElement;
  /** Initial state of the namespace, if any */
  initialState?: any;
  /** Callback fired with namespace key after the namespace is created */
  onNamespaceCreated?: (namespace: symbol) => void;
  /** Store if it was not provided via a react-redux Provider */
  store?: Store;
}
export class InstanceProvider extends React.Component<InstanceProviderProps> {
  static contextType = ReactReduxContext;
  private namespace: symbol;
  private store: Store;

  constructor(props: InstanceProviderProps) {
    super(props);
    let store: Store;
    if (props.store) store = props.store;
    else if (this.context && this.context.store) store = this.context.store;
    else throw new Error('Could not find a redux store and none was provided');
    this.store = store;

    let action = createNamespace(props.type, props.initialState);
    this.namespace = action.namespace;
    if (this.props.onNamespaceCreated) this.props.onNamespaceCreated(this.namespace);
    store.dispatch(action);
  }

  componentWillUnmount(): void {
    this.store.dispatch(deleteNamespace(this.namespace));
  }

  render(): JSX.Element {
    return this.props.children(this.namespace);
  }
}

/**
 * Wrap the mapStateToProps function to a namespace
 * @param inner Wrapped function
 */
export function wrapState<
  TStateProps, TOwnProps extends { namespace: symbol }
>(
  inner: (state: any, props: TOwnProps) => TStateProps
): (state: any, props: TOwnProps) => TStateProps {
  return function wrappedMapStateToProps(state: any, props: TOwnProps): TStateProps {
    return inner(state.namespaced[props.namespace], props);
  };
}

export function wrapDispatch<
  TDispatchProps, TOwnProps extends { namespace: symbol }, A extends Action = AnyAction
>(
  inner: (dispatch: Dispatch<A>, props: TOwnProps) => TDispatchProps
): (dispatch: Dispatch<A>, props: TOwnProps) => TDispatchProps {
  return function wrappedMapDispatchToProps(dispatch: Dispatch<A>, props: TOwnProps): TDispatchProps {
    return inner(bindDispatch<A>(dispatch, props.namespace), props);
  };
}
