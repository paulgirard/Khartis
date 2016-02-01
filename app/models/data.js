import Ember from 'ember';
import Struct from './struct';

let RowStruct = Struct.extend({
    header: null,
    cells: null,
    layout: null,
    init() {
        this._super();
        this.set('layout', {
            sheet: {
               height: null
            }
        });
    },
    export(opts) {
        return this._super({
            header: this.get('header'),
            cells: this.get('cells').map( c => c.export() ),
            layout: this.get('layout')
        });
    }
});

RowStruct.reopenClass({
    createWithModel(row) {
        let o = this.create();
        o.setProperties({
            cells: row.get('cells').map( (c, i) => {
                return CellStruct.create({
                    column: c.get('column'),
                    row: o
                })
            })
        });
        return o;
    },
    restore(json, refs) {
        let o = this._super(json, refs);
        o.setProperties({
            header: json.header,
            layout: json.layout,
            cells: json.cells.map( c => CellStruct.restore(c, refs) )
        });
        return o;
    }
});

let ColumnStruct = Struct.extend({
    cells: null, //not exported, visitor pattern
    layout: null,
    meta: null,
    
    init() {
        this._super();
        this.set('cells', Ember.A());
        this.set('meta', {
           type: "text",
           probability: 1,
           precision: 6,
           manual: false
        });
        this.set('layout', {
            sheet: {
                width: null
            }
        });
    },
    
    registerCell(cell) {
        if (!this.get('cells').some( c => c == cell )) {
            this.get('cells').addObject(cell);
        }
    },
    
    autoDetectDataType: function() {
        
        var p = {
            text: 0,
            numeric: 0
        };
        
        this.get('cells')
            .filter( c => !c.get('row.header'))
            .forEach( (c, i, arr) => {
                if (/^\d+(\.\d+)?$/.test(c.get('value'))) {
                    p.numeric += 1/arr.length;
                } else {
                    p.text += 1/arr.length;
                }
            });

        let type = Object.keys(p).reduce( (r, key) => {
           return r == null || p[key] > p[r] ? key : r;
        }, null);
        
        this.set('meta.type', type);
        this.set('meta.probability', p[type]);
        
    }.observes('cells.@each.value'),
    
    export() {
        return this._super({
            layout: this.get('layout'),
            meta: this.get('meta')
        });
    }
});

ColumnStruct.reopenClass({
    restore(json, refs) {
        let o = this._super(json, refs);
        o.setProperties({
            layout: json.layout,
            meta: json.meta
        });
        return o;
    }
});

let CellStruct = Struct.extend({
    column: null,
    row: null,
    value: null,
    
    index() {
        return this.get('row.cells').indexOf(this);
    },
    
    isFirstOfRow() {
        return this.index() === 0;
    },
    
    isLastOfRow() {
        return this.index() === this.get('row.cells').length - 1;
    },
    
    init() {
        this._super();
        this.set('state', {
            sheet: {
                    edited: false,
                    selected: false,
                    resizing: false
                   }
        });
    },
    
    onColumnChange: function() {
        if (this.get('column')) {
            this.get('column').registerCell(this);
        }
    }.observes('column').on('init'),
    
    export() {
        return this._super({
            column: this.get('column._uuid'),
            row: this.get('row._uuid'),
            value: this.get('value')
        });
    }
});

CellStruct.reopenClass({
    restore(json, refs) {
        let o = this._super(json, refs);
        o.setProperties({
            value: json.value,
            column: refs[json.column],
            row: refs[json.row]
        });
        return o;
    }
});

let DataStruct = Struct.extend({
    
    rows: null,
    columns: null,
    
    header: function() {
        return this.get('rows')[0];
    }.property('rows.[]'),
    
    body: function() {
        return this.get('rows').slice(1);
    }.property('rows.[]'),
    
    size: function() {
        return this.get('rows').length * this.get('columns').length;
    },
    
    selectedCell() {
        for (let row of this.get('rows')) {
            for (let cell of row.get('cells')) {
                if (cell.get('state.sheet.selected')) {
                    return cell;
                }
            }       
        }
        return null;
    },
    
    getCellAt(row, col) {
        return this.get('rows').objectAt(row).get('cells').objectAt(col);
    },
    
    addRow() {
        let selectedCell = this.selectedCell(),
            shift = selectedCell && !selectedCell.get('row.header') ? 0:1,
            row = selectedCell ? selectedCell.get('row') : this.get('rows')[this.get('rows.length') - 1],
            index = this.get('rows').indexOf(row);
            
        this.get('rows').insertAt(index + shift, RowStruct.createWithModel(row));
    },
    
    //TODO : non testé
    removeRow(row) {
        this.get('rows').removeObject(row);
    },
    
    addColumn() {
        let selectedCell = this.selectedCell(),
            shift = selectedCell ? 0:1,
            index = selectedCell ? this.get('columns').indexOf(selectedCell.get('column')) : this.get('columns.length') - 1,
            column = ColumnStruct.create();
        
        this.get('columns').insertAt(index + shift, column);
        this.get('rows').forEach( r => {
            r.get('cells').insertAt(
                index + shift,
                CellStruct.create({
                    column: column,
                    row: r
                })
            );
        });
    },
    
    //TODO : non testé
    removeColumn(column) {
        this.get('rows').forEach( r => {
           r.set('cells', r.get('cells').filter( c => c.get('column') != column ));
        });
        this.get('columns').removeObject(column);
    },
    
    export() {
        return this._super({
            rows: this.get('rows').map( x => x.export() ),
            columns: this.get('columns').map( x => x.export() )
        });
    }
    
});

DataStruct.reopenClass({
    createFromRawData(data) {
        
        let columns = [],
            rows = data.map( (r, i) => {
                let row = RowStruct.create();
                row.setProperties({
                    header: i === 0,
                    cells: r.map ( (c, j) => {
                        return CellStruct.create({
                            value: c,
                            column: columns[j] ? columns[j] : (columns[j] = ColumnStruct.create()),
                            row: row
                        });
                    })
                });
                return row;
            });
        
        return this.create({
            rows: rows,
            columns: columns
        });
        
    },
    restore(json, refs = {}) {
        let o = this._super(json, refs);
        o.setProperties({
            columns: json.columns.map( x => ColumnStruct.restore(x, refs) ),
            rows: json.rows.map( x => RowStruct.restore(x, refs) )
        });
        return o;
    }
});

export {DataStruct, RowStruct, ColumnStruct, CellStruct};