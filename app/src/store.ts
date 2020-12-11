import { NamespaceContainer, registerTypes } from './redux-instance';
import { applyMiddleware, compose as reduxCompose, createStore } from 'redux';
import logger from 'redux-logger';

import { types as CounterListTypes } from './CounterList';

let namespaceContainer = new NamespaceContainer();
// @ts-ignore
let compose = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || reduxCompose;
export const store = createStore(
  (a: any): any => a,
  { namespaced: NamespaceContainer.NAMESPACED_STATE },
  compose(applyMiddleware(logger), namespaceContainer.enhancer.bind(namespaceContainer))
);
namespaceContainer.setStore(store);

registerTypes(store, CounterListTypes);
