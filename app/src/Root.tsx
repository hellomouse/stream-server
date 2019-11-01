import * as React from 'react';
import { Provider } from 'react-redux';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link,
  useParams
} from 'react-router-dom';
import { InstanceProvider } from './redux-instance-react';
import CounterList from './CounterList';

import { store } from './store';
import './App.css';

const Root: React.FC = () => {
  return (
    <Provider store={store}>
      <Router>
        <Switch>
          <Route path="/">
            <div>
              <h2>Home</h2>
              <p>i dunno lol</p>
              <p>perhaps go to the <Link to="/count">counters</Link>?</p>
            </div>
          </Route>
          <Route path="/count">
            <div>
              <h2>Counters</h2>
              <p><Link to="/">go back home</Link></p>
              {/* but there's two of them */}
              <InstanceProvider type="CounterList">
                {(namespace: symbol): React.ReactElement =>
                  <CounterList namespace={namespace} />}
              </InstanceProvider>
              <InstanceProvider type="CounterList">
                {(namespace: symbol): React.ReactElement =>
                  <CounterList namespace={namespace} />}
              </InstanceProvider>
            </div>
          </Route>
        </Switch>
      </Router>
    </Provider>
  );
};

/*
import StreamList from './StreamList';
import StreamViewer from './StreamViewer';

          <Route path="/">
            <StreamList />
          </Route>
          <Route path="/:stream">
            <StreamViewer />
          </Route>
*/

export default Root;
