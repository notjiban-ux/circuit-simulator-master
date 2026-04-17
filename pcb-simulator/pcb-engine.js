// ============================================
// PCB Engine — Board data model
// ============================================

export class PCBBoard {
  constructor() {
    this.components = [];
    this.traces = [];
    this.vias = [];
    this.zones = [];
    this.nets = [];
    this.boardWidth = 500;
    this.boardHeight = 400;
  }

  addComponent(comp) {
    this.components.push(comp);
    return comp;
  }

  removeComponent(id) {
    this.components = this.components.filter(c => c.id !== id);
  }

  addTrace(trace) {
    this.traces.push(trace);
    return trace;
  }

  removeTrace(id) {
    this.traces = this.traces.filter(t => t.id !== id);
  }

  addVia(via) {
    this.vias.push(via);
    return via;
  }

  getNetList() {
    const nets = {};
    this.traces.forEach(trace => {
      if (!nets[trace.net]) {
        nets[trace.net] = { traces: [], components: [] };
      }
      nets[trace.net].traces.push(trace);
    });
    return nets;
  }

  clear() {
    this.components = [];
    this.traces = [];
    this.vias = [];
    this.zones = [];
  }

  toJSON() {
    return {
      components: this.components,
      traces: this.traces,
      vias: this.vias,
      boardWidth: this.boardWidth,
      boardHeight: this.boardHeight,
    };
  }

  fromJSON(data) {
    this.components = data.components || [];
    this.traces = data.traces || [];
    this.vias = data.vias || [];
    this.boardWidth = data.boardWidth || 500;
    this.boardHeight = data.boardHeight || 400;
  }
}
