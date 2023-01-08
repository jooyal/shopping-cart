const db = require('../config/connection.js');
const collection = require('../config/collections.js');
const { ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

module.exports = {
    doLogin : (loginData)=>{
        return new Promise(async(resolve, reject) => {
            let response = {}
            let admin = await db.get().collection(collection.ADMIN_COLLECTION).findOne({Email:loginData.Email});
            
            if(admin){
                
                bcrypt.compare(loginData.Password,admin.Password).then((status)=>{
                    //console.log(status);
                    if(status){
                        console.log('admin login successful'),
                        response.admin = admin;
                        response.status = true;
                        resolve(response)
                    } else{
                        console.log('Admin Login failed : Wrong password');
                        resolve({msg:'wrongPassword'})
                    }
                })
            } else{
                console.log("Admin Login failed : Account doesn't exist")
                resolve({msg:'noAccount'})
            }
        })
    },
    changePassword : (adminData)=>{
        return new Promise(async(resolve, reject) => {
            let adminExist = await db.get().collection(collection.ADMIN_COLLECTION).findOne({Email:adminData.Email})
            if(adminExist){
                adminData.Password = await bcrypt.hash(adminData.Password,10);
                db.get().collection(collection.ADMIN_COLLECTION)
                .updateOne({Email:adminData.Email},{$set:{Password:adminData.Password}}).then((response)=>{
                    if(response){
                        //console.log(response);
                        resolve({status:true,msg:'Password Changed Successfully'})
                    }
                })
            }else {
                resolve({status:false,msg:'admin doesnt exist'})
            }
        })
    },
    getAllUsers : ()=>{
        return new Promise(async(resolve, reject) => {
            let users = await db.get().collection(collection.USER_COLLECTION).find().toArray()
            resolve(users)
        })
    },
    getAllOrders : ()=>{
        return new Promise(async(resolve, reject) => {
            let orders = await db.get().collection(collection.ORDER_COLLECTION).find().toArray()
            resolve(orders)
        })
    }
}