import { StoreNamespaceManager } from './redux-instance';
import { applyMiddleware, compose as reduxCompose } from 'redux';
import logger from 'redux-logger';

// @ts-ignore
let compose = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || reduxCompose;
export const store = StoreNamespaceManager.createStore(
  a => a,
  {},
  compose(applyMiddleware(logger))
);

