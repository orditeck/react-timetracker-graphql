import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { Spinner, SpinnerSize } from 'office-ui-fabric-react/lib/Spinner';

export default class Loader extends Component {

    static defaultProps = {
        label: 'Loading...',
        size: SpinnerSize.large
    };

    static propTypes = {
        label: PropTypes.node,
        size: PropTypes.oneOf([ SpinnerSize.xSmall, SpinnerSize.small, SpinnerSize.medium, SpinnerSize.large ]),
    };

    render() {
        return (
            <div id="mastloader">
                <Spinner size={ this.props.size } label={ this.props.label } />
            </div>
        );
    }
}
