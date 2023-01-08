require('dotenv').config();
const db = require('../config/connection.js');
const collection = require('../config/collections.js');
const bcrypt = require('bcryptjs');
const { ObjectId } = require('mongodb');
const Razorpay = require('razorpay');
const crypto = require('crypto');

let instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  })

module.exports = {
    doSignup : (userData)=>{
        return new Promise(async (resolve,reject)=>{
            userData.Password = await bcrypt.hash(userData.Password,10);
            db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data)=>{
                console.log(userData)
                resolve(userData);
            });
        });
    },
    doLogin : (loginData)=>{
        return new Promise(async (resolve,reject)=>{
            let loginStatus = false;
            let response = {};
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({Email:loginData.Email});
            if(user){
                bcrypt.compare(loginData.Password,user.Password).then((status)=>{//comparing hashed password in mongodb(user.Password) with the password that user entered in login page(loginData.Password).
                    if(status){
                        console.log("Login Success");
                        response.user = user;
                        response.status = true;
                        resolve(response);
                    }else{
                        console.log("Login Failed!-wrong password");
                        resolve({status:false});
                    }
                });
                
            }else{
                console.log("Login Failed!-Account doesnt exist");
                resolve({status:false});
            }
        })
    },
    addToCart : (productId,userId) => {

        let productObject = {
            item: ObjectId(productId),
            //user: ObjectId(userId),
            quantity:1
        }

        return new Promise(async (resolve, reject) => {
            let usercart = await db.get().collection(collection.CART_COLLECTION).findOne({user:ObjectId(userId)})
            
            //if a cart exist which is linked to users id, execute this.
            if(usercart) {
                //check if the currently added product previousely exist in the cart of the user.
                let productExistCheck = usercart.products.findIndex(product=>product.item==productId)
                //if product does exist, increase the quantity of the product.
                if(productExistCheck!=-1){
                    db.get().collection(collection.CART_COLLECTION).updateOne({'products.item':ObjectId(productId),'user':ObjectId(userId)},
                    {
                        $inc:{'products.$.quantity':1}
                    }).then((response)=>{
                        resolve(response)
                        //resolve(response=false) for flipkart style cart
                    })
                    //if product doesnt exist in cart, make an object with product id and its initial quantity as 1
                    // and push the object to the cart
                }else {
                    db.get().collection(collection.CART_COLLECTION)
                    .updateOne({user:ObjectId(userId)},
                    {

                        $push:{products:productObject}
                    
                    }).then((response)=>{
                        resolve(response)
                        //resolve(response=true)
                    })
                }
                //if a cart doesnot exist, make a cart with users id and add an array named products
                // and we will push the id of the product and its quantity togather as an object to the array.
            } else {
                let cartObj = {
                    user: ObjectId(userId),
                    products : [productObject]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response)=>{
                    resolve(response)
                })
            }
        })
    },
    getCartProducts : (userId)=>{
        return new Promise(async (resolve, reject) => {
            let cartProducts = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match:{user:ObjectId(userId)}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },{
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'productInfo'
                    }
                },//the output from lookup is in form of an array. to change it into an object, we use $arrayElemAt:[name-of-array, array-element-position-which-needs-to-be-converted-to-object]
                {
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$productInfo',0]}
                    }
                }
                // {
                //     $lookup:{
                //         from: collection.PRODUCT_COLLECTION,//collection name to lookinto
                //         localField: 'products.item',
                //         foreignField: '_id',
                //         as: 'cartItems'
                //     }
                // }
            ]).toArray();
            //console.log(cartProducts)
            let cartExistCheck = await db.get().collection(collection.CART_COLLECTION).findOne({user:ObjectId(userId)});
            if(cartExistCheck){
                resolve(cartProducts);
            }else {
                resolve();
            }
        })
    },
    getCartCount : (userId)=>{
        return new Promise(async (resolve, reject) => {
            let count=0
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({user:ObjectId(userId)})
            if(cart){
                //count = cart.products.length
                count = await db.get().collection(collection.CART_COLLECTION).aggregate([
                    {
                        $match:{user:ObjectId(userId)}
                    },
                    {
                        $project:{
                            '_id':0,//no need for id in output.
                            'totalQuantity' : {$sum:'$products.quantity'}
                        }
                    },
                    
                ]).toArray()
            }
            //console.log(count[0].totalQuantity);
            if(count[0]){
                resolve(count[0].totalQuantity);
            }else{
                resolve (0);
            }
            
        })
    },
    changeProductCount : (details)=>{
        return new Promise((resolve, reject) => {
            if(details.count==-1 && details.quantity==1){
                db.get().collection(collection.CART_COLLECTION)
                .updateOne({_id:ObjectId(details.cart)},
                {
                    $pull:{products:{item:ObjectId(details.product)}}
                }).then((response)=>{
                    resolve({removeProduct:true})
                })
            }else {
                db.get().collection(collection.CART_COLLECTION)
                .updateOne({_id:ObjectId(details.cart),'products.item':ObjectId(details.product)},
                {
                    $inc:{'products.$.quantity':parseInt(details.count)}

                }).then((response)=>{
                    resolve({removeProduct:false})
                })
            }
        })
    },
    deleteCartProduct : (details)=>{
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CART_COLLECTION)
            .updateOne({_id:ObjectId(details.cart)},
            {
                $pull:{products:{item:ObjectId(details.product)}}
            }).then((response)=>{
                resolve(true)
            })
        })
    },
    getTotalAmount : (userId)=>{
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match:{user:ObjectId(userId)}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'productInfo'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$productInfo',0]}
                    }
                },
                {
                    $project:{
                        quantity:1, price: {$toInt: '$product.productPrice'},
                    }
                },
                {
                    $group:{
                        _id:null,
                        total:{$sum:{$multiply:['$quantity','$price']}}
                    }
                }
            ]).toArray()
            .then((response)=>{
                //console.log(response[0].total)
                if((response[0]!=null)){
                    resolve(response[0].total)
                }else{
                    resolve(0)
                }
            })
        })
    },
    getCartProductList : (userId)=>{
        return new Promise(async(resolve, reject) => {
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({user:ObjectId(userId)});
            resolve(cart.products)
        })
    },
    placeOrder : (orderDetails,products,total)=>{
        return new Promise((resolve, reject) => {
            //console.log(orderDetails,products,total)
            let status = orderDetails.paymentMethod === 'COD'?'placed':'pending' //if orderDetails.paymentMethod equalto COD, then status is assigned string value 'placed'. else case(if onlinePayment), status is assigned 'pending'.
            //console.log(orderDetails[])
            let orderObject = {
                deliveryDetails:{
                    mobileNumber : orderDetails.mobile,
                    address : orderDetails.address,
                    pincode : orderDetails.pincode
                },
                userId : ObjectId(orderDetails.userId),
                paymentMethod : orderDetails.paymentMethod,
                products : products,
                totalAmount : total,
                status : status,
                date: new Date().toLocaleString(undefined, {timeZone: 'Asia/Kolkata'})
            }

            //inserting orderObject containing order details inside the 'order' collection.

            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObject).then((response)=>{
                db.get().collection(collection.CART_COLLECTION).deleteOne({user:ObjectId(orderDetails.userId)}).then(()=>{
                    resolve({paymentMethod:orderDetails.paymentMethod,orderId:response.insertedId})
                })
            })
            
        })
    },
    getOrderHistory : (userId,totalPrice)=>{
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).find({userId:ObjectId(userId)}).toArray().then((orderHistory)=>{
                if(orderHistory){
                    //console.log(orderHistory)
                    resolve(orderHistory)
                }
            })
        })
    },
    getOrderHistoryProducts : (orderId)=>{
        return new Promise((resolve, reject) => {
            // db.get().collection(collection.ORDER_COLLECTION).findOne({_id:ObjectId(orderId)}).then((orderData)=>{
            //     resolve(orderData.products);
            db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match:{_id:ObjectId(orderId)}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                    }
                }
            ]).toArray()
            .then((data)=>{
                //console.log(data);
                resolve(data)
            })
        })
    },
    getRazorPay : (orderId,totalAmount)=>{
        //console.log('helper-called.');
        return new Promise((resolve, reject)=>{
            instance.orders.create({
                amount: totalAmount+'00',
                currency: "INR",
                receipt: ""+orderId,
                
              }).then((response)=>{
                //console.log(response)
                resolve(response)
              }).catch((err)=>{
                reject(err)
              })
        })
    },
    verifyPayment : (details,RazorpayId)=>{
        return new Promise((resolve, reject)=>{
            let hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET); // adding the name of algorithm and the secret key for hashing

            hmac.update(RazorpayId+'|'+details['payment[razorpay_payment_id]']) //data to be hashed
            hmac = hmac.digest('hex'); //converting the hashed product to hexacode string
            //check if the hmac generated here matches with the hexacode signature that razorpay sent back after successful payment.
            if(hmac === details['payment[razorpay_signature]']) {
                resolve()
            }else {
                reject()
            }
        })
    },
    changePaymentStatus : (orderId)=>{
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION)
            .updateOne({_id:ObjectId(orderId)},
            {
                $set : {
                    status:'placed'
                }
            }).then((response)=>{
                //console.log('response: '+response)
                resolve()
            })
        })
    }
        
};