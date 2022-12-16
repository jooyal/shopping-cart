//view products page
let addToCart = (productId)=>{
    $.ajax({
        url:'/add-to-cart/'+productId,
        method:'get',
        success:(response)=>{
            if(response.status){
                let count = $('#cart-count').html();
                count = parseInt(count)+1;
                $('#cart-count').html(count);
            }
        }
    })
}

//cart page
let changeQuantity = (userId,cartId,productId,count)=>{
    let qty = parseInt(document.getElementById(productId).innerHTML)
    //console.log(userId);
    $.ajax({
        url:'/change-product-quantity',
        data:{
            user:userId,
            cart:cartId,
            product:productId,
            count:count,
            quantity:qty
        },
        method:'post',
        success:(response)=>{
            if(response.removeProduct){
                alert('Product removed from cart!')
                location.reload()
            }else{//if there is no product being removed, change count and change total through ajax. if product is removed, as page is reloaded, there is no need for changing via ajax, the count will be changed after refresh
                //console.log(response);
                document.getElementById(productId).innerHTML = qty+parseInt(count);
                document.getElementById('total').innerHTML = response.total
            }
        }
    })
}

let deleteCartProduct = (cartId,productId,productName)=>{
    let confirmation = confirm("Are you sure you want to remove ' "+productName+" ' from cart?");
    if(confirmation==true){
        $.ajax({
            url:'/delete-cart-product',
            data:{
                cart:cartId,
                product:productId,
            },
            method:'post',
            success:(response)=>{
                if(response){
                    alert('Product removed from cart!')
                    location.reload()
                }
            }
        })
    }
}