// Aucun accès Google direct ; session gérée par l'application parente.
window.recReferenceRequest=body=>{
 if(window.parent===window || typeof window.parent.recReferenceRequest!=='function')return Promise.reject(Error('Ouvrir Paramétrage depuis l’application REC authentifiée.'));
 return window.parent.recReferenceRequest(body);
};
