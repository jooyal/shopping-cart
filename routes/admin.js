var express = require('express');
var router = express.Router();
let productHelpers = require('../helpers/product-helpers.js');
let adminHelpers = require('../helpers/admin-helpers.js');
const fs = require('fs');
const userHelpers = require('../helpers/user-helpers.js');

/* GET users listing. */

const verifyLogin = (req,res,next)=>{
  if(req.session.adminLoggedIn === true) {
    next()
  } else {
    res.redirect('/admin/login')
  }
}

router.get('/', verifyLogin, function(req, res, next) {
  productHelpers.getAllProducts().then((products)=>{
    const title = 'Admin Panel';
    const admin = req.session.admin
    res.render('admin/view-products', {admin,title,products});
  })
});

router.get('/login',(req,res)=>{
  res.render('admin/admin-login',{adminLoginErr:req.session.adminLoginErr})
  req.session.adminLoginErr = null;
})

router.post('/login',(req,res)=>{
  adminHelpers.doLogin(req.body).then((response)=>{
    if(response.status===true){
      req.session.adminLoggedIn = true;
      req.session.admin = response.admin
      res.redirect('/admin')
      //console.log(response.admin);

    }else {

      if(response.msg === 'wrongPassword') {
        req.session.adminLoginErr = 'Admin Login failed : Wrong password';
        res.redirect('/admin/login')
      } else if(response.msg === 'noAccount') {
        req.session.adminLoginErr = "Admin Login failed : Account doesn't exist";
        res.redirect('/admin/login')
      }

    }
  })
})

router.get('/change-password',verifyLogin, (req,res)=>{
  const admin = req.session.admin
  res.render('admin/change-password',{admin,modifyError:req.session.changePassError})
  req.session.changePassError = null;
})

router.post('/change-password',verifyLogin, (req,res)=>{
  //checks if password entered twice is same or not
  if(req.body.Password === req.body.PasswordRe){
    adminHelpers.changePassword(req.body).then((response)=>{
      if(response.status===true){
        /*res.send("<script>alert('Password changed successfully')</script>")*/
        res.redirect('/admin')
      }else {
        req.session.changePassError = response.msg;
        res.redirect('/admin/change-password')
      }
    })
  }else{
    req.session.changePassError = 'Passwords entered doesnt match'
    res.redirect('/admin/change-password')
  }
})

router.get('/logout',(req,res)=>{
  req.session.admin = null
  req.session.adminLoggedIn = false
  res.redirect('/admin/login')
})

router.get('/all-users',verifyLogin,(req,res)=>{
  const admin = req.session.admin
  adminHelpers.getAllUsers().then(users=>{
    //console.log(users);
    res.render('admin/all-users',{admin,users})
  })
})

router.get('/all-orders',verifyLogin,(req,res)=>{
  const admin = req.session.admin
  adminHelpers.getAllOrders().then(orders=>{
    //console.log(orders);
    res.render('admin/all-orders',{admin,orders})
  })
})


router.get('/add-products', verifyLogin, function(req, res, next) {
  const title = 'Add Products';
  res.render('admin/add-products', {admin:true,title});
});

router.post('/add-products', function(req, res, next) {
  productHelpers.addProduct(req.body, (id)=>{
    let image = req.files.productImage //to get the photo submitted through form, in binary format.
    image.mv('./public/product-images/'+id+'.jpg',(err,done)=>{
      if(!err){
        res.redirect('/admin/');
      }else{
        console.log(err);
      }
    });
  });
});

router.get('/delete-product/:id', verifyLogin,(req,res)=>{
  let productId = req.params.id;
  productHelpers.deleteProduct(productId).then((response)=>{

    //to remove the saved image
        const filePath = './public/product-images/'+productId+'.jpg';

        fs.unlink(filePath, (err) => {
          if (err) {
            // Handle the error
            console.error(err);
          } else {
            // The file was deleted successfully
            console.log(`Successfully deleted ${filePath}`);
          }
        });
    res.redirect('/admin/');
  })
});

router.get('/edit-product/:id', verifyLogin,(req,res)=>{
  let productId = req.params.id;
  productHelpers.getProductDetails(productId).then((productData)=>{
    // console.log(productData)
    const title = 'Edit Products';
    res.render('admin/edit-products',{admin:true,title,productData})
  })
})

router.post('/edit-products/:id',(req,res)=>{
  let productId = req.params.id
  productHelpers.updateProductDetails(productId,req.body).then((productId)=>{
    res.redirect('/admin')
    if(req.files.productImage!=null){
      let image = req.files.productImage //to get the photo submitted through form, in binary format.
    image.mv('./public/product-images/'+productId+'.jpg');
    }
  })
})
module.exports = router;