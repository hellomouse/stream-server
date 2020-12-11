import * as React from 'react';
import { Action, AnyAction } from 'redux';
import { connect } from 'react-redux';
import { createNamespace, unrefNamespace } from './redux-instance';
import { useNamespace, useNamespacedState, useNamespacedDispatch } from './redux-instance-react';

export interface AddCounterAction extends Action<string> { id: symbol }
export interface DeleteCounterAction extends Action<string> { id: symbol }
export type DeleteAllCountersAction = Action<string>
export const CounterListType = {
  name: 'CounterList',
  reducer(state: any, action: AnyAction): any {
    switch (action.type) {
      case 'ADD_COUNTER': {
        return [...state, action.id];
      }
      case 'DELETE_COUNTER': {
        return state.filter((id: symbol) => id !== action.id);
      }
      case 'DELETE_ALL': {
        return [];
      }
      default: return state;
    }
  },
  initialState: [],
  actions: {
    addCounter(id: symbol): AddCounterAction {
      return { type: 'ADD_COUNTER', id };
    },
    deleteCounter(id: symbol): DeleteCounterAction {
      return { type: 'DELETE_COUNTER', id };
    },
    deleteAllCounters(): DeleteAllCountersAction {
      return { type: 'DELETE_ALL' };
    }
  }
};

export const DummyType = {
  name: 'DummyType',
  reducer(state: any, _action: AnyAction): any {
    return state;
  },
  initialState: {}
};

export const types = [CounterListType, DummyType];

interface Props {
  namespace?: symbol;
}

let CounterList: React.FC<Props> = props => {
  // use namespace from props or fallback to context
  let lastState = React.useRef<symbol[]>([]);
  let namespace = useNamespace(props.namespace);
  let dispatch = useNamespacedDispatch(namespace);
  let counters: symbol[] = useNamespacedState(namespace);
  lastState.current = counters;

  let deleteAllCounters = () => {
    dispatch(CounterListType.actions.deleteAllCounters());
    for (let counter of counters) dispatch(unrefNamespace(counter, namespace));
  };

  React.useEffect(() => () => {
    for (let counter of lastState.current) dispatch(unrefNamespace(counter, namespace));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <button onClick={() => {
        let nsCreate = createNamespace(DummyType.name, namespace);
        let created = nsCreate.namespace;
        dispatch(nsCreate);
        dispatch(CounterListType.actions.addCounter(created));
      }}>make new thing</button>
      <button onClick={deleteAllCounters}>delete all the things</button>
      <ul>
        {counters.map((counter, index) => {
          return <li key={index}>
            {counter.toString()}
            <button onClick={() => {
              dispatch(CounterListType.actions.deleteCounter(counter));
              dispatch(unrefNamespace(counter, namespace));
            }}>X</button>
          </li>;
        })}
      </ul>
    </div>
  );
};

export default connect()(CounterList);
/*
export default connectNamespace<StateProps, DispatchProps, OwnProps>(
  state => ({ counters: state }),
  dispatch => ({
    addCounter(): void {
      let nsCreate = createNamespace(DummyType.name);
      let namespace = nsCreate.namespace;
      dispatch(nsCreate);
      dispatch(CounterListType.actions.addCounter(namespace));
    },
    deleteCounter(counter): void {
      dispatch(CounterListType.actions.deleteCounter(counter));
      dispatch(deleteNamespace(counter));
    },
    deleteAllCounters(allCounters): void {
      dispatch(CounterListType.actions.deleteAllCounters());
      for (let counter of allCounters) dispatch(deleteNamespace(counter));
    }
  })
)(CounterList);
*/
