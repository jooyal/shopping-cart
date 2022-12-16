const db = require('../config/connection.js');
const collection = require('../config/collections.js');
const objectId = require('mongodb').ObjectId

module.exports = {
    addProduct:(product,callback)=>{
        // console.log(product);
        db.get().collection(collection.PRODUCT_COLLECTION).insertOne(product).then((data)=>{
            console.log(data);
            callback(data.insertedId);
        });
    },
    getAllProducts:()=>{
        return new Promise(async(resolve,reject)=>{
            let products = await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray(); //here, we can either use async/await or callback function method or .then-which is already defined in the deleteOne method.
            resolve(products);
        });
    },
    deleteProduct:(productId)=>{
        return new Promise((resolve,reject)=>{
            //console.log(productId)
            db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({_id:objectId(productId)}).then((response)=>{
                if(response){
                    resolve(response);
                }else {
                    reject("Error while deletion!");
                }
            })
        })
    },
    getProductDetails:(productId)=>{
        return new Promise ((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:objectId(productId)}).then((productData)=>{
                if(productData){
                    resolve(productData);
                }else {
                    reject("Error while fetching data!");
                }
            })
        })
    },
    updateProductDetails:(productId,updatedDetails)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({_id:objectId(productId)},
            {$set:{productName: updatedDetails.productName,
                productCategory: updatedDetails.productCategory,
                productPrice: updatedDetails.productPrice,
                productDescription: updatedDetails.productDescription,}}).then((response)=>{
                    resolve(productId);
            })
        })
    }
    
};