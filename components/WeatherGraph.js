/** @jsx React.DOM */
var React = require('react');
var _ = require("lodash");
var d3 = require("d3");

var WeatherSvgPath = require("./WeatherSvgPath");
var GraphCursor = require("./GraphCursor");

function cmp(a, b) {
    return b.time.getTime() - a.time.getTime();
}

// TODO: this is a sorted array. We could binary search it...
function findClosest(value, arr, start) {
    return arr.reduce(function(best, current) {
        if (Math.abs(cmp(value, current)) < Math.abs(cmp(value, best))) {
            return current;
        } else {
            return best;
        }
    }, start || arr[0]);
}

var WeatherGraph = React.createClass({

    componentWillReceiveProps: function(props) {
        this.computeData(props);
    },

    getWidth: function() {
        return window.innerWidth - this.props.margin;
    },

    getHeight: function() {
        return 300;
        // return parseInt(screen.height / 2);
        return Math.max(parseInt(window.innerHeight / 3), 200);
    },

    updateDimensions: function() {
        this.setState({
            width: this.getWidth(),
            height: this.getHeight()
        });
    },

    getInitialState: function() {
        return {
            width: this.getWidth(),
            height: this.getHeight(),
            selectedPoints: [],

            maxValue: 12,
            minValue: 0,

            startTime: new Date(),
            endTime: new Date(),

            _cursorPosition: null
        };
    },

    getDefaultProps: function() {
        return {
            padding: 30,
            paddingTop: 5,
            margin: 20
        };
    },

    computeData: function(props) {
        props = props || this.props;
        var newState = this.getInitialState();

        props.lines.forEach(function(d) {
            _.forEach(d, function(values) {

                var minValue = d3.min(values, function(d) { return d.value; });
                var maxValue = d3.max(values, function(d) { return d.value; });

                var startTime = d3.min(values, function(d) { return d.time; });
                var endTime = d3.max(values, function(d) { return d.time; });


                newState.maxValue = d3.max([maxValue, newState.maxValue]);
                newState.minValue = d3.min([minValue, newState.minValue]);

                newState.startTime = d3.min([startTime, newState.startTime]);
                newState.endTime = d3.max([endTime, newState.endTime]);

            });
        });

        // Ensure that the current is always visible in the graph
        newState.endTime = new Date(
             Math.max(newState.endTime.getTime(), Date.now())
         );
        newState.startTime = new Date(
             Math.min(newState.startTime.getTime(), Date.now())
         );

        this.setState(newState);
    },


    updateScales: function() {
        var state = this.state;

        var xScale = d3.scale.linear()
            .domain([state.startTime, state.endTime])
            .range([this.props.padding, state.width - this.props.padding]);

        var yScale = d3.scale.linear()
            .domain([state.minValue, state.maxValue])
            .range([state.height - this.props.padding, this.props.paddingTop])
            ;

        // educated guess
        var tickLabelWidth = 50;

        var xAxis = d3.svg.axis()
            .scale(xScale)
            .orient("bottom")
            .tickValues(d3.time.hours(state.startTime, state.endTime))
            .tickFormat(function(d) {
                return d3.time.format("%H")(new Date(d));
            })
            ;

        var yAxis = d3.svg.axis()
            .scale(yScale)
            .orient("left")
            ;

        var yAxisRight = d3.svg.axis()
            .scale(yScale)
            .orient("right")
            ;

        _.extend(this, {
            xScale: xScale,
            yScale: yScale,
            xAxis: xAxis,
            yAxis: yAxis,
            yAxisRight: yAxisRight
        });

    },

    componentWillMount: function() {
        this.updateDimensions();
    },


    renderAxes: function() {
        if (!this.xAxis) return;
        if (!this.yAxis) return;
        if (!this.yAxisRight) return;

        this.xAxis(d3.select(this.refs.xAxis.getDOMNode()));
        this.yAxis(d3.select(this.refs.yAxis.getDOMNode()));
        this.yAxisRight(d3.select(this.refs.yAxisRight.getDOMNode()));
    },

    componentDidMount: function() {
        this.computeData();
        window.addEventListener("resize", this.updateDimensions);
    },

    componentWillUnmount: function() {
        window.removeEventListener("resize", this.updateDimensions);
    },

    componentDidUpdate: function() {
        this.renderAxes();
    },

    handleTouchMove: function(e) {
        e.preventDefault();
        this.handleMove(e.targetTouches[0].clientX);
    },

    handleMouseMove: function(e) {
        this.handleMove(e.clientX);
    },

    handleMove: function(clientX) {
        if (clientX === null || clientX === undefined) return;
        var cursorPosition = clientX - this.refs.svg.getDOMNode().offsetLeft;
        console.log("move!", cursorPosition);
        this.computeClosestPoints(cursorPosition);
    },

    selectNone: function() {
        this.computeClosestPoints();
    },

    computeClosestPoints: function(cursorPosition) {
        var pos = { time: new Date() };

        if (cursorPosition) {
            pos.time = new Date(this.xScale.invert(cursorPosition));
        } else {
            cursorPosition = this.xScale(new Date());
        }

        var self = this;
        var points = _.compact(this.props.lines.map(function(line) {
            var points = line.observations;
            if (pos.time.getTime() > Date.now()) {
                points = line.forecasts.filter(function(p) {
                    return p.time.getTime() > Date.now();
                });
            }
            var point = findClosest(pos, points);
            if (!point) return;
            return {
                title: line.title,
                time: point.time,
                value: point.value,
                x: self.xScale(point.time.getTime()),
                y: self.yScale(point.value)
            };
        }));

        this.props.onSlide({
            points: points,
            cursorPosition: cursorPosition,
        });

        console.log("setting points", points.length);
        this.setState({
            selectedPoints: points,
            cursorPosition: cursorPosition
        });
    },

    renderLimit: function(desc, color, limit) {
        var bottom = this.state.height;
        bottom -= this.yScale(this.state.maxValue - limit);
        bottom -= this.props.padding;

        var textHeight = 8;
        var textWidth = 100;
        return (
            <g>
                <rect
                    x={this.props.padding}
                    y={this.props.paddingTop}
                    width={this.state.width - this.props.padding*2}
                    height={bottom}
                    fill={color} />

                <text
                    className="limit-text"
                    x={this.state.width - textWidth}
                    y={bottom + this.props.paddingTop - textHeight}
                    fill="black">{desc}</text>

            </g>

        );
    },

    render: function() {
        var self = this;
        this.updateScales();

        console.log("points in state", this.state.selectedPoints.length);
        var circles = this.state.selectedPoints.map(function(point) {
            return (
                <circle
                    cx={point.x}
                    cy={point.y}
                    r="3"
                    fill="blue"
                    stroke="0"
                />
            );
        });

        return (
            <div className="graph">
                <svg
                    ref="svg"
                    onMouseMove={this.handleMouseMove}
                    onTouchStart={this.handleTouchMove}
                    onTouchMove={this.handleTouchMove}
                    onMouseLeave={this.selectNone}
                    width={this.state.width}
                    height={this.state.height} >

                    {this.renderLimit("Student limit", "#F3F3F3", 8)}
                    {this.renderLimit("License limit", "#D8D8D8", 11)}

                    <GraphCursor
                        height={self.state.height}
                        cursorPosition={self.state.cursorPosition}
                        padding={self.props.padding}
                        width={self.state.width}
                        paddingTop={self.props.paddingTop}
                    />

                    {circles}

                    {self.props.lines.map(function(d) {
                        return (
                            <WeatherSvgPath
                                key={d.title}
                                xScale={self.xScale}
                                yScale={self.yScale}
                                observations={d.observations}
                                forecasts={d.forecasts}
                            />
                        );
                    })}


                    <g
                        ref="xAxis"
                        className="axis"
                        transform={ "translate(0, " + (self.state.height - self.props.padding) + ")" }
                    />

                    <g
                        ref="yAxis"
                        className="axis"
                        transform={ "translate(" + self.props.padding + ",0)" }
                    />

                    <g
                        ref="yAxisRight"
                        className="axis"
                        transform={ "translate(" +  (self.state.width - self.props.padding) + ",0)" }
                    />

                </svg>
            </div>
        );
    }
});

module.exports = WeatherGraph;
