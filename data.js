/* The site's connection to Firebase: Google sign-in, the guest list in Firestore, and file saving.
   It offers the same small interface the page was first written against (window.claude.use),
   so the page itself does not need to know which database is behind it. */
(function(){
  'use strict';
  var config = window.FIREBASE_CONFIG, fb = window.firebase;
  var state = {configured: false, user: null, email: '', role: null, auth: null, store: null};

  var ready = new Promise(function(resolve){
    if (!config || !fb) { resolve(state); return; }
    try {
      fb.initializeApp(config);
      state.auth = fb.auth(); state.store = fb.firestore(); state.configured = true;
    } catch (e) { resolve(state); return; }
    var stop = state.auth.onAuthStateChanged(async function(user){
      stop();
      if (!user) { resolve(state); return; }
      state.user = user; state.email = String(user.email || '').toLowerCase();
      // who may do what is decided by the staff list, and enforced again by the database rules
      try {
        var me = await state.store.collection('staff').doc(state.email).get();
        if (me.exists) state.role = me.data().role === 'organiser' ? 'organiser' : 'door';
      } catch (e) { state.role = null; }
      resolve(state);
    }, function(){ resolve(state); });
  });

  function docSnap(s){ return {id: s.id, exists: !!s.exists, data: function(){ return s.exists ? s.data() : undefined; }}; }
  function wrapDoc(ref){
    return {
      id: ref.id, path: ref.path,
      get: function(){ return ref.get().then(docSnap); },
      set: function(data){ return ref.set(data); },
      update: function(data){ return ref.update(data); },
      delete: function(){ return ref.delete(); },
      acquire: function(){ return Promise.resolve({acquired: true}); },   // check-ins use a transaction instead (see checkIn)
      onSnapshot: function(next, fail){ return ref.onSnapshot(function(s){ next(docSnap(s)); }, function(e){ if (fail) fail(e); }); }
    };
  }
  function wrapCollection(ref){
    return {
      path: ref.path,
      doc: function(id){ return wrapDoc(id ? ref.doc(id) : ref.doc()); },
      get: function(){ return ref.get().then(function(q){ return {docs: q.docs.map(docSnap), size: q.size, empty: q.empty}; }); },
      onSnapshot: function(next, fail){
        return ref.onSnapshot(function(q){ next({docs: q.docs.map(docSnap), size: q.size, empty: q.empty}); }, function(e){ if (fail) fail(e); });
      }
    };
  }
  var db = {
    doc: function(path){ return wrapDoc(state.store.doc(path)); },
    collection: function(path){ return wrapCollection(state.store.collection(path)); },
    // One atomic step: a pass can be admitted once, even if two doors scan it in the same second.
    checkIn: function(code){
      var ref = state.store.collection('guests').doc(code);
      return state.store.runTransaction(function(tx){
        return tx.get(ref).then(function(s){
          if (!s.exists || !s.data().name) return {status: 'missing'};
          var g = s.data();
          if (g.checkedInAt) return {status: 'dup', guest: g};
          var at = Date.now();
          tx.update(ref, {checkedInAt: at});
          return {status: 'ok', guest: {name: g.name, list: g.list, checkedInAt: at}};
        });
      });
    }
  };
  var user = {
    isOwner: function(){ return Promise.resolve(state.role === 'organiser'); },
    can: function(){ return Promise.resolve(!!state.role); }
  };
  // An ordinary website may save a file directly.
  var downloads = {
    save: function(req){
      return new Promise(function(resolve, reject){
        try {
          var blob = req.data instanceof Blob ? req.data : new Blob([req.data]);
          var url = URL.createObjectURL(blob), a = document.createElement('a');
          a.href = url; a.download = req.filename; a.style.display = 'none';
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(function(){ URL.revokeObjectURL(url); }, 60000);
          resolve({status: 'saved'});
        } catch (e) { reject({code: 'unavailable', message: String(e)}); }
      });
    }
  };

  window.claude = {
    use: function(name){
      return ready.then(function(s){
        if (name === 'db') return s.user ? db : null;
        if (name === 'user') return user;
        if (name === 'downloads') return downloads;
        return null;
      });
    }
  };
  window.site = {
    state: ready,
    signIn: function(){
      if (!state.auth) return Promise.reject(new Error('not configured'));
      var provider = new fb.auth.GoogleAuthProvider();
      provider.setCustomParameters({prompt: 'select_account'});
      return state.auth.signInWithPopup(provider);
    },
    signOut: function(){ return state.auth ? state.auth.signOut() : Promise.resolve(); }
  };
})();
