/* ====== CONFIG - replace these placeholders with your Firebase web config ====== */
const firebaseConfig = {
  apiKey: "AIzaSyDisrvCAebT1irQP9HTFBVXkJ_16uRw_yE",
  authDomain: "capital-multicuisine-app.firebaseapp.com",
  projectId: "capital-multicuisine-app",
  storageBucket: "capital-multicuisine-app.appspot.com",   // or use the exact value shown in your console
  messagingSenderId: "730998608543",
  appId: "1:730998608543:web:71a3ea4891366d998f88aa"
};
/* ========================================================= */

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Sample menu fallback (will use Firestore 'menu' if present)
const SAMPLE_MENU = [
  {id:'b1', name:'Veg Biryani', price:249, img:'/item1.jpg', category:'Biryani', desc:'Fragrant veg biryani.'},
  {id:'b2', name:'Chicken Biryani', price:349, img:'/item2.jpg', category:'Biryani', desc:'Classic chicken biryani.'},
  {id:'k1', name:'Seekh Kebab (4 pcs)', price:249, img:'/item3.jpg', category:'Kebabs', desc:'Juicy kebabs.'},
  {id:'c1', name:'Family Combo', price:899, img:'/combo1.jpg', category:'Combos', desc:'Feeds 4-5.'},
  {id:'s1', name:'Naan (2 pcs)', price:49, img:'/item4.jpg', category:'Sides', desc:'Fresh naan.'}
];

let MENU = [];
let cart = {};
let BRANCHES = [];

const elements = {
  menu: document.getElementById('menu'),
  categoryTabs: document.getElementById('categoryTabs'),
  banners: document.getElementById('banners'),
  cartCount: document.getElementById('cartCount'),
  openCartBtn: document.getElementById('openCartBtn'),
  cartPanel: document.getElementById('cartPanel'),
  cartItems: document.getElementById('cartItems'),
  cartTotal: document.getElementById('cartTotal'),
  checkoutBtn: document.getElementById('checkoutBtn'),
};

// Load menu from Firestore 'menu' collection if exists
async function loadMenu(){
  try{
    const snapshot = await db.collection('menu').get();
    if(!snapshot.empty){
      MENU = snapshot.docs.map(d=>({id: d.id, ...d.data()}));
    } else {
      MENU = SAMPLE_MENU;
    }
  } catch(err){
    console.log('firestore menu load failed, using sample', err);
    MENU = SAMPLE_MENU;
  }
  renderCategories();
  renderMenu(MENU);
  renderBanners();
}

// Load branches collection
async function loadBranches(){
  try{
    const snap = await db.collection('branches').get();
    BRANCHES = snap.docs.map(d=>({ id: d.id, ...d.data() }));
  } catch(err){
    console.error('Failed loading branches', err);
    BRANCHES = [
      { id:'malakpet', name:'Malakpet', address:'Malakpet', lat:17.3780, lng:78.5250, radius_km:5 },
      { id:'hyderguda', name:'Hyderguda', address:'Hyderguda', lat:17.3775, lng:78.4749, radius_km:5 }
    ];
  }
}

// UI rendering
function uniqueCategories(){
  const cats = [...new Set(MENU.map(m=>m.category || 'Others'))];
  return cats;
}

function renderCategories(){
  const cats = uniqueCategories();
  elements.categoryTabs.innerHTML = '';
  const all = document.createElement('button');
  all.className='category-pill active'; all.textContent='All';
  all.onclick = ()=>{ document.querySelectorAll('.category-pill').forEach(p=>p.classList.remove('active')); all.classList.add('active'); renderMenu(MENU); };
  elements.categoryTabs.appendChild(all);
  cats.forEach(c=>{
    const btn = document.createElement('button');
    btn.className='category-pill'; btn.textContent=c;
    btn.onclick = ()=>{ document.querySelectorAll('.category-pill').forEach(p=>p.classList.remove('active')); btn.classList.add('active'); renderMenu(MENU.filter(x=>x.category===c)); };
    elements.categoryTabs.appendChild(btn);
  });
}

function renderBanners(){
  const promos = [
    {id:'p1', title:'Family Combo — Save ₹150', subtitle:'Limited time'},
    {id:'p2', title:'Party Orders — Call for bulk discounts', subtitle:'Ask us for menu'}
  ];
  elements.banners.innerHTML = '';
  promos.forEach(p=>{
    const d = document.createElement('div'); d.className='banner';
    d.innerHTML = `<strong>${p.title}</strong><div>${p.subtitle}</div>`;
    elements.banners.appendChild(d);
  });
}

function renderMenu(list){
  elements.menu.innerHTML = '';
  list.forEach(item=>{
    const c = document.createElement('div'); c.className='card';
    c.innerHTML = `
      <img src="${item.img||'/placeholder.jpg'}" alt="${item.name}">
      <div class="meta">
        <h4>${item.name}</h4>
        <div class="desc">${item.desc||''}</div>
        <div style="margin-top:8px;display:flex;justify-content:space-between;align-items:center">
          <div>₹${item.price}</div>
          <div class="qty">
            <button data-action="add" data-id="${item.id}">+</button>
          </div>
        </div>
      </div>
    `;
    elements.menu.appendChild(c);
  });
  document.querySelectorAll('button[data-action="add"]').forEach(b=>b.addEventListener('click',e=>{
    const id = e.target.dataset.id;
    addToCart(id);
  }));
}

function addToCart(id){
  const it = MENU.find(m=>m.id===id);
  if(!it) return;
  if(!cart[id]) cart[id] = {...it, qty:0};
  cart[id].qty++;
  updateCartUI();
}

function updateCartUI(){
  elements.cartCount.textContent = Object.values(cart).reduce((s,i)=>s+i.qty,0);
  elements.cartItems.innerHTML = '';
  let total = 0;
  Object.values(cart).forEach(it=>{
    total += it.qty * it.price;
    const div = document.createElement('div');
    div.style.display='flex'; div.style.justifyContent='space-between'; div.style.marginBottom='8px';
    div.innerHTML = `<div>${it.name} x ${it.qty}</div><div>₹${it.qty*it.price}</div>`;
    elements.cartItems.appendChild(div);
  });
  elements.cartTotal.textContent = total;
}

elements.openCartBtn.addEventListener('click', ()=> elements.cartPanel.classList.toggle('hidden'));
document.getElementById('closeCart').addEventListener('click', ()=> elements.cartPanel.classList.add('hidden'));

elements.checkoutBtn.addEventListener('click', ()=>{
  if(Object.keys(cart).length===0){ alert('Cart is empty'); return; }
  document.getElementById('checkoutModal').classList.remove('hidden');
  renderBranchSelector();
});

document.getElementById('cancelCheckout').addEventListener('click', ()=> document.getElementById('checkoutModal').classList.add('hidden'));

function renderBranchSelector(){
  let container = document.getElementById('branchSelector');
  if(!container){
    const modal = document.querySelector('.modal-box');
    const div = document.createElement('div');
    div.id = 'branchSelector';
    div.innerHTML = `<label>Choose branch or use my location:
        <select id="branchSelect"></select>
        <button id="useMyLoc" type="button">Use my location</button>
      </label>
      <div id="branchMsg" style="margin-top:6px;font-size:14px;color:#555"></div>`;
    modal.insertBefore(div, modal.querySelector('#coupon'));
    container = div;
  }
  const sel = document.getElementById('branchSelect');
  sel.innerHTML = '';
  BRANCHES.forEach(b=>{
    const opt = document.createElement('option');
    opt.value = b.id;
    opt.textContent = `${b.name} — ${b.address || ''}`;
    sel.appendChild(opt);
  });
  if(BRANCHES.length) sel.value = BRANCHES[0].id;

  document.getElementById('useMyLoc').addEventListener('click', async ()=>{
    const msg = document.getElementById('branchMsg'); msg.textContent = 'Getting your location...';
    if(!navigator.geolocation){ msg.textContent = 'Geolocation not supported.'; return; }
    navigator.geolocation.getCurrentPosition(async pos=>{
      const lat = pos.coords.latitude, lng = pos.coords.longitude;
      let nearest = null, minD = Infinity;
      BRANCHES.forEach(b=>{
        const d = haversineDistance(lat, lng, b.lat, b.lng);
        if(d < minD){ minD = d; nearest = {...b, distance_km: d}; }
      });
      if(!nearest){ msg.textContent = 'No branches found.'; return; }
      nearest.distance_km = Math.round(nearest.distance_km*100)/100;
      document.getElementById('branchSelect').value = nearest.id;
      msg.textContent = `Nearest branch: ${nearest.name} (${nearest.distance_km} km).`;
      window.__customer_coords = {lat, lng};
    }, err=>{
      msg.textContent = 'Location permission denied or unavailable.';
    }, {timeout:10000});
  });
}

function haversineDistance(lat1, lon1, lat2, lon2){
  function toRad(x){ return x * Math.PI / 180; }
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

document.getElementById('placeOrder').addEventListener('click', async ()=>{
  const name = document.getElementById('custName').value || 'Guest';
  const phone = document.getElementById('custPhone')?.value || '';
  const addr = document.getElementById('custAddr').value || '';
  const payment = document.getElementById('paymentMethod').value || 'Cash on Delivery';
  const coupon = document.getElementById('coupon').value || '';
  if(Object.keys(cart).length===0){ alert('Cart empty'); return; }

  let discount = 0;
  if(coupon.trim().toUpperCase()==='CAPITAL50') discount = 50;

  const order = {
    customer: {name, phone, address: addr},
    payment, coupon, discount,
    items: Object.values(cart).map(i=>({id:i.id,name:i.name,price:i.price,qty:i.qty})),
    total: Number(elements.cartTotal.textContent) - discount,
    status: 'new',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  const result = await validateBranchCoverageAndPlaceOrder(order);
  if(result){
    document.getElementById('checkoutMsg').textContent = 'Order placed! Order ID: ' + result;
    cart = {}; updateCartUI();
    setTimeout(()=>{ document.getElementById('checkoutModal').classList.add('hidden'); document.getElementById('checkoutMsg').textContent=''; }, 1600);
  }
});

async function validateBranchCoverageAndPlaceOrder(order){
  const branchId = document.getElementById('branchSelect')?.value;
  const branch = BRANCHES.find(b=>b.id===branchId);
  if(!branch){ alert('Please choose a branch.'); return false; }

  let custCoords = window.__customer_coords || null;

  if(!custCoords){
    try{
      const pos = await new Promise((res, rej)=> navigator.geolocation.getCurrentPosition(res, rej, {timeout:8000}));
      custCoords = {lat: pos.coords.latitude, lng: pos.coords.longitude};
    } catch(e){
      const ok = confirm('We could not detect your location. Press OK to continue as pickup from selected branch, Cancel to stop.');
      if(ok){
        order.deliveryType = 'pickup';
      } else { alert('Please allow location permission or enter pickup.'); return false; }
    }
  }

  if(custCoords){
    const dist = haversineDistance(custCoords.lat, custCoords.lng, branch.lat, branch.lng);
    if(dist > (branch.radius_km || 5)){
      alert(`Sorry — your location is ${Math.round(dist*100)/100} km from ${branch.name}. Delivery available within ${branch.radius_km||5} km. Please choose pickup or another branch.`);
      return false;
    }
    order.branchId = branch.id;
    order.branchName = branch.name;
    order.customerCoords = custCoords;
    order.distance_km = Math.round(dist*100)/100;
    order.deliveryType = 'delivery';
  } else {
    order.branchId = branch.id;
    order.branchName = branch.name;
    order.deliveryType = order.deliveryType || 'pickup';
  }

  const doc = await db.collection('orders').add(order);
  return doc.id;
}

function listenOrdersCount(){ db.collection('orders').where('status','==','new').onSnapshot(snap=>{}); }

async function init(){
  await loadBranches();
  await loadMenu();
  updateCartUI();
  listenOrdersCount();
}
init();

if('serviceWorker' in navigator){ navigator.serviceWorker.register('/sw.js').catch(()=>console.log('sw fail')); }
