const React = require('react');
const { View } = require('react-native');

const noop = () => null;

const MapView = (props) => React.createElement(View, props);
MapView.Animated = (props) => React.createElement(View, props);

module.exports = {
  default: MapView,
  MapView,
  Marker: noop,
  Callout: noop,
  CalloutSubview: noop,
  Polyline: noop,
  Polygon: noop,
  Circle: noop,
  Overlay: noop,
  Heatmap: noop,
  UrlTile: noop,
  PROVIDER_GOOGLE: 'google',
  PROVIDER_DEFAULT: null,
};
