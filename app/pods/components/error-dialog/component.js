import Ember from 'ember';
import XModal from 'mapp/pods/components/x-modal/component';

var ConfirmDialog = XModal.extend({

  layoutName: "components/confirm-dialog",

  classNames: ["modal", "fade", "error"],

  title: null,
  message: null,
  acceptLabel: null,

  autoShow: Ember.computed('', {

    get(key) { return false },
    set(key, val) { throw "no sense"; }

  }),

  _promise: null,

  didInsertElement: function() {

    this.get('ModalManager').connect(this);

    this.$().on('hidden.bs.modal', e => {

      this.sendAction('reject');

    });

  },

  show: function(message, title="Erreur", acceptLabel=null) {

    this.setProperties({
      message: message,
      title: title,
      acceptLabel: acceptLabel
    });

    this.$().modal({
      backdrop: 'static'
    });

    this.$().css("z-index", parseInt($(".modal-backdrop").css("z-index"))+1);

    var promise = new Ember.RSVP.Promise( (resolve, reject) => {

      this.set('_promise', {resolve: (...params) => resolve.apply(this, params), reject: () => reject()});

    });

    return promise;

  },

  actions: {

    accept: function() {

      this.hide();
      this.get('_promise').resolve();

    },

    reject: function() {

      this.hide();
      this.get('_promise').reject();

    },

    cancel: function() {

      this.hide();

    }

  }


});

export default ConfirmDialog;
