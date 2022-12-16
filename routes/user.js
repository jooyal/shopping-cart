const express = require('express');
const router = express.Router();
const productHelpers = require('../helpers/product-helpers.js');
const userHelpers = require('../helpers/user-helpers.js');

const verifyLogin = (req,res,next)=>{
  if(req.session.userLoggedIn) {
    next();
  }else {
    res.redirect('/login');
  }
}

let RazorpayId //order id which needs to be compared with the hashed signature from razorpay after payment
let OrderId //to be displayed in order success page

/* GET home page. */
router.get('/',async function(req, res, next) {
  const user = req.session.user;
  let cartCount //number to be displayed in the header showing number of items in cart (displayed inside span)
    if(user){
      //console.log('user present')
      let productCount = await userHelpers.getCartCount(req.session.user._id)
        cartCount=productCount
    }else {
      cartcount = null;
    }
  productHelpers.getAllProducts().then((products)=>{
    const title = 'EasyKart'
    res.render('user/view-products', {products,title,user,cartCount});
  });
});

router.get('/signup', function(req,res,next){
  if(req.session.userLoggedIn == true) {
    res.redirect('/');
  }else {
    res.render('user/user-signup');
  }
  
});

router.post('/signup', function(req,res,next){
  userHelpers.doSignup(req.body).then((response)=>{
    req.session.userLoggedIn = true;
    req.session.user = response;
    res.redirect('/')
  })
});

router.get('/login', function(req,res,next){
  if(req.session.userLoggedIn == true) {
    res.redirect('/');
  }else {
    res.render('user/user-login',{userLoginErr:req.session.userLoginErr});
    req.session.userLoginErr = null
  }
});

router.post('/login', function(req,res,next){
  userHelpers.doLogin(req.body).then((response)=>{
    if(response.status) {
      req.session.userLoggedIn = true;
      req.session.user = response.user;
      res.redirect('/')
    }else {
      req.session.userLoginErr = "Error : Invalid username or password."
      res.redirect('/login');
    }
  })
});

router.get('/logout', (req,res)=>{
  req.session.user = null;
  req.session.userLoggedIn = false;
  res.redirect('/')
})

///////async-await preferred more than .then method for promise, due to good readability. Do error handling carefully for async-await.

router.get('/cart',verifyLogin,async (req,res)=>{
  const user = req.session.user;
  let products = await userHelpers.getCartProducts((req.session.user._id));
  let total = await userHelpers.getTotalAmount(req.session.user._id);
  if(products){
    //console.log(products)
    res.render('user/cart',{products,user,total});
  }else {
    res.send('<h2>Cart is empty</h2>')
  }
});

router.get('/add-to-cart/:id',verifyLogin,(req,res)=>{
  //console.log("Api Call")
  userHelpers.addToCart(req.params.id/*id passed via get request*/,req.session.user._id).then((response)=>{
    //res.redirect('/')
     //res.json({status:response})
     res.json({status:true})
  })
})

router.post('/change-product-quantity',(req,res)=>{
  userHelpers.changeProductCount(req.body).then(async (response)=>{
    response.total = await userHelpers.getTotalAmount(req.body.user);
    
    res.json(response)
  })
})

router.post('/delete-cart-product',(req,res)=>{
  userHelpers.deleteCartProduct(req.body).then((response)=>{
    res.json(response)
  })
})

router.get('/place-order',verifyLogin,(req,res)=>{
  const user = req.session.user;
  userHelpers.getTotalAmount(req.session.user._id).then((cartTotal)=>{
    res.render('user/place-order',{user,cartTotal})
  })
})

router.post('/place-order',verifyLogin,async (req,res)=>{
  let products = await userHelpers.getCartProductList(req.body.userId);
  let totalAmount = await userHelpers.getTotalAmount(req.body.userId)
  userHelpers.placeOrder(req.body,products,totalAmount).then((responseAfterOrder)=>{
    if(responseAfterOrder.paymentMethod==='COD') {

      OrderId = responseAfterOrder.orderId //for insertion in success payment page

      res.json({codPayment:true})
    }else if(responseAfterOrder.paymentMethod==='ONLINE'){
      //console.log('its online payment');
      userHelpers.getRazorPay(responseAfterOrder.orderId,totalAmount).then((response)=>{
        RazorpayId = response.id;
        //console.log(RazorpayId)
        res.json(response)
      })
    }else {
      res.send('Error!')
    }
  })
})

router.get('/order-placed-successfully',verifyLogin,(req,res)=>{
  const user = req.session.user;
  res.render('user/order-placed-successfully',{user,OrderId})
  OrderId = null  //resetting global value
})

router.get('/order-history',verifyLogin,async(req,res)=>{
  const user = req.session.user;
  let history = await userHelpers.getOrderHistory(req.session.user._id)
  if(history.length !== 0){
    res.render('user/order-history',{user,history})
  } else{
    res.send("<script>alert('No order history found')</script><h1>No orders to show.<h1>")
  }
})

router.get('/order-history-product-list/:id',async(req,res)=>{
  const user = req.session.user
  let orderId = req.params.id
  let products = await userHelpers.getOrderHistoryProducts(orderId)
  res.render('user/order-history-product-list',{user,products})
})

router.post('/verify-payment',(req,res)=>{
  //console.log(req.body);
  userHelpers.verifyPayment(req.body,RazorpayId).then(()=>{

    OrderId = (req.body['order[receipt]']); //for insertion in success payment page
    RazorpayId = null; //resetting global value
    //console.log('receipt number : '+req.body['order[receipt]']);
    //if payment is verified successfully, we have to change the status of the order placed as success.
    userHelpers.changePaymentStatus(req.body['order[receipt]']).then((response)=>{
      res.json({status:true})
    })
    .catch((err)=>{
      res.json({status:false,errMsg:'Payment Failed'})
    })
  })
})

module.exports = router;