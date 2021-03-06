import Struct from 'mapp/models/struct';

let TextVisualization = Struct.extend({
  
  type: "text",
  color: "#404040",
  size: 1,
  anchor: "middle",
  overwrites: {},

  getGeometry(id, geom) {
    return this.get('overwrites')[id] || geom;
  },

  setGeometry(id, geom) {
    this.get('overwrites')[id] = geom;
    this.notifyPropertyChange('overwrites');
  },

  deferredChange: Ember.debouncedObserver(
    'color', 'anchor', 'size', 'overwrites',
    function() {
      this.notifyDefferedChange();
    },
    10),
  
  export(props) {
    return this._super(Object.assign({
      type: this.get('type'),
      color: this.get('color'),
      anchor: this.get('anchor'),
      size: this.get('size'),
      overwrites: this.get('overwrites')
    }, props));
  }
  
});

TextVisualization.reopenClass({
  restore(json, refs = {}) {
    let o = this._super(json, refs, {
      type: json.type,
      color: json.color,
      anchor: json.anchor,
      size: json.size,
      overwrites: Object.assign({}, json.overwrites)
    });
    return o;
  }
});

export default TextVisualization;
