/** @jsx React.DOM */

var React = require("react");
window.React = React;
var _ = require("lodash");
var Winds = require("./CurrentWinds");
var Sunset = require("./Sunset");
var Clouds = require("./Clouds");

var Main = React.createClass({

    getInitialState: function() {
        return {
            windObservations: { data: [] },
            gustObservations: { data: [] },
            windForecasts: { data: [] },
            gustForecasts: { data: [] }
        };
    },

    render: function() {
        return (
            <div>
                <div className="cf weather-boxes">

                    <Winds
                        windObservations={this.state.windObservations}
                        windForecasts={this.state.windForecasts}
                        gustObservations={this.state.gustObservations}
                        gustForecasts={this.state.gustForecasts}
                    />

                    <Sunset
                        latitude={this.props.options.lat}
                        longitude={this.props.options.lon}
                    />

                    <Clouds metar={this.state.metar} />

                </div>


            </div>
        );
    }

});

module.exports = Main;
