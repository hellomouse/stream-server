import * as React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { ReduxType } from './redux-instance';
import { wrapState, wrapDispatch } from './redux-instance-react';

export interface StateProps {
  counters: symbol[];
}

interface DispatchProps {

}

interface OwnProps {
  namespace: symbol;
}

type Props = StateProps & DispatchProps & OwnProps;

const CounterList: React.FC<Props> = props => {
  return <div>Hi</div>;
};

export default connect<StateProps, DispatchProps, OwnProps>(
  wrapState<StateProps, OwnProps>(state => ({ counters: state.counters })),
  wrapDispatch<DispatchProps, OwnProps>(dispatch => bindActionCreators({
    asdf
  }, dispatch))
)(CounterList);
