import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter, Switch, Route } from 'react-router-dom'
import { Fabric } from 'office-ui-fabric-react/lib/Fabric';

import './stylesheets/main.css';

import Timesheet from './components/pages/Timesheet';
import Clients from './components/pages/Clients';
import Projects from './components/pages/Projects';
import Project from './components/pages/Project';
import Users from './components/pages/Users';
import NotFound from './components/pages/NotFound';

ReactDOM.render(
    <Fabric>
        <BrowserRouter>
            <Switch>
                <Route exact path='/' component={Timesheet} />
                <Route exact path='/timesheets' component={Timesheet} />
                <Route exact path='/timesheets/week/:date' component={Timesheet} />
                <Route exact path='/timesheets/user/:userId' component={Timesheet} />
                <Route exact path='/timesheets/user/:userId/week/:week' component={Timesheet} />
                <Route path='/clients' component={Clients} />
                <Route exact path='/projects' component={Projects} />
                <Route path='/projects/:projectId' component={Project} />
                <Route path='/users' component={Users} />
                <Route component={NotFound} />
            </Switch>
        </BrowserRouter>
    </Fabric>,
    document.getElementById('root')
);
