var Shopify = Shopify || {};
// ---------------------------------------------------------------------------
// Money format handler
// ---------------------------------------------------------------------------
Shopify.money_format = "${{amount}}";
Shopify.formatMoney = function(cents, format) {
    if (typeof cents == 'string') { cents = cents.replace('.',''); }
    var value = '';
    var placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
    var formatString = (format || this.money_format);

    function defaultOption(opt, def) {
        return (typeof opt == 'undefined' ? def : opt);
    }

    function formatWithDelimiters(number, precision, thousands, decimal) {
        precision = defaultOption(precision, 2);
        thousands = defaultOption(thousands, ',');
        decimal   = defaultOption(decimal, '.');

        if (isNaN(number) || number == null) { return 0; }

        number = (number/100.0).toFixed(precision);

        var parts   = number.split('.'),
            dollars = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands),
            cents   = parts[1] ? (decimal + parts[1]) : '';

        return dollars + cents;
    }

    switch(formatString.match(placeholderRegex)[1]) {
        case 'amount':
            value = formatWithDelimiters(cents, 2);
            break;
        case 'amount_no_decimals':
            value = formatWithDelimiters(cents, 0);
            break;
        case 'amount_with_comma_separator':
            value = formatWithDelimiters(cents, 2, '.', ',');
            break;
        case 'amount_no_decimals_with_comma_separator':
            value = formatWithDelimiters(cents, 0, '.', ',');
            break;
    }

    return formatString.replace(placeholderRegex, value);
};

const theme = {
     /**
     * getCollectionProducts
     * @param collectionHandle {string}
     * @returns {Promise<object>}
     */
    getCollectionProducts: function (collectionHandle){
        return new Promise(function(resolve, reject){
            try {
                $.getJSON('/collections/' + collectionHandle + '/products.json?limit=250', resolve);
            }catch (e){
                reject(e);
            }
        });
    },

    collection: {
        dataTabs: [],
        render: function (collectionHandle){
            if (this.dataTabs.length > 0) {
                const _this = this;
                if( collectionHandle === '' ){
                    collectionHandle = 'all';
                }
                theme.getCollectionProducts(collectionHandle).then(function (collection) {
                    const tabsObject = _this.getTabsObject();
                    const productByTab = _this.getProductsByTab(collection.products, tabsObject);
                    let collectionTemplate = '';
                    for (const tabContent of productByTab) {
                        if( tabContent.products.length > 0 ){
                            collectionTemplate += _this.getTemplate.collectionTab(tabContent, collectionHandle);
                        }
                    }
                    const collectionProducts = document.getElementById('collection-products');
                    collectionProducts.innerHTML = collectionTemplate;
                    _this.collectionTabs();
                });
            }
        },

        changeCollection: function (){
            let collectionNavItems = document.getElementsByClassName('collection-item');
            for (const collectionNavItem of collectionNavItems) {
                collectionNavItem.addEventListener('click', function (e){
                    e.preventDefault();
                    let collectionHandle = collectionNavItem.getAttribute('collection-handle');
                    let activeNavItem = document.getElementsByClassName('collection-item active')[0];
                    if( activeNavItem ){
                        activeNavItem.classList.remove('active');
                    }
                    collectionNavItem.classList.add('active');
                    this.render(collectionHandle);
                }.bind(this));
            }
        },

        collectionTabs: function (){
            let tabsElements = document.getElementsByClassName('product-tab-heading');
            for (const tabsElement of tabsElements) {
                tabsElement.addEventListener('click', function (){
                    this.parentNode.classList.toggle('hide-content');
                });
            }
        },

        getProductsByTab: function (products, tabs) {
            for (const tab of tabs) {
                for (const product of products) {
                    if (product.tags.includes(tab.tag)) {
                        tab.products.push(product);
                    }
                }
            }
            return tabs;
        },

        getTabsObject: function () {
            let tabsObject = [];
            for (let index in this.dataTabs) {
                let tabParse = JSON.parse(this.dataTabs[index]);
                tabsObject[index] = {
                    tag: tabParse['tab-tag'],
                    title: tabParse['tab-title'],
                    products: []
                };
            }
            return tabsObject;
        },

        getTemplate: {
            stripHtml: function(html){
                let tmp = document.createElement("DIV");
                tmp.innerHTML = html;
                return tmp.textContent || tmp.innerText || "";
            },
            productGridItem: function (collectionHandle, product, variant){
                let variantId = '';
                let variantTitle = '';
                let productPrice = product.variants[0].price;
                if( variant !== undefined ){
                    variantId = '?variant=' + variant.id;
                    variantTitle = variant.title;
                    productPrice = variant.price;
                }

                let text = '';
                for (const tag of product.tags) {
                    if(tag.includes('text__')){
                        text = tag.replace('text__', '');
                    }
                }
                return `
                <div class="product-grid-item">
                    <a href="/collections/${collectionHandle}/products/${ product.handle }/${variantId}">
                        <span class="img-wrap">
                            <img class="product-img"
                                 src="${ product.images[0].src }}"
                                 alt="${ product.title }" />
                            </span>
                            <span class="product-info">
                            <div class="product-title">${ product.title }</div>
                            <div class="some-text"><b>${ variantTitle }</b></div>
                            <div class="product-price"><strong>$${ productPrice }</strong></div>
                            <span class="desc">${ this.stripHtml(product.body_html) }</span>
                        </span>
                    </a>
                </div>`;
            },
            collectionTab: function (tabContent, collectionHandle){
                let tabTemplate = `
                <div class="product-tab unselectable">
                    <div class="product-tab-heading align-center">
                        <h3 class="heading">${tabContent.title}</h3>
                    </div>
                    <div class="product-tab-content">
                        <div class="product-grid">`;

                for (const product of tabContent.products) {
                    if( product.variants.length > 0 ){
                        for (const variant of product.variants) {
                            tabTemplate += this.productGridItem(collectionHandle, product, variant);
                        }
                    }else{
                        tabTemplate += this.productGridItem(product);
                    }
                }
                tabTemplate += `</div></div></div>`;
                return tabTemplate;
            }
        },

        init: function () {
            let locationPath = window.location.pathname.split('/');
            let pageTemplate = locationPath[locationPath.length - 2];
            let pageHandle = locationPath[locationPath.length - 1];
            if( pageHandle === 'collections' ){
                pageHandle = 'all';
            }
            if ( pageTemplate.includes('collection') || pageHandle.includes('all') ) {
                this.dataTabs = tabSettings;
                this.render(pageHandle);
            }
            this.changeCollection();
        },
    },

    cart: {
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With':'xmlhttprequest' /* XMLHttpRequest is ok too, it's case insensitive */
        },
        addToCart: function(data, success){
            fetch('/cart/add.js', {
                body: JSON.stringify(data),
                credentials: 'same-origin',
                headers: this.headers,
                method: 'POST'
            }).then(function(response) {
                return response.json();
            }).then(function(data) {
                success(data);
            }).catch(function(err) {
                console.log(err);
            });
        },
        getCart: function (success){
            fetch('/cart.js', {
                credentials: 'same-origin',
                headers: this.headers,
                method: 'GET'
            }).then(function(response) {
                return response.json();
            }).then(function(data) {
                console.log('cart success');
                success(data);
            }).catch(function(err) {
                console.log(err);
            });
        },
        updateCart: function(data, success){
            fetch('/cart/update.js', {
                body: JSON.stringify(data),
                credentials: 'same-origin',
                headers: this.headers,
                method: 'POST'
            }).then(function(response) {
                return response.json();
            }).then(function(data) {
                success(data);
            }).catch(function(err) {
                console.log(err);
            });
        },
        removeCartItem: function(data, success){
            fetch('/cart/change.js', {
                body: JSON.stringify(data),
                credentials: 'same-origin',
                headers: this.headers,
                method: 'POST'
            }).then(function(response) {
                return response.json();
            }).then(function(data) {
                success(data);
            }).catch(function(err) {
                console.log(err);
            });
        },
    },

    product: {
        productTabs: function (){
            let productTabsItems = document.querySelectorAll('.product-template-boxes .heading');
            for (const tabElement of productTabsItems) {
                tabElement.addEventListener('click', function (){
                    this.parentNode.classList.toggle('show-tab-content');
                });
            }
        },
        addProductToCart(data){
            console.log(data);
            theme.cart.addToCart(data, function (){
                theme.cart.getCart(function (cart){
                    theme.cartDrawer.render(cart);
                });
            }, function (err){
                console.log(err);
            });
        },
        init: function (){
            this.productTabs();
            let addVariantToCartButtons = document.getElementsByClassName('add-product-variant');
            let addToCartButton = document.getElementById('AddToCart');
            if (addToCartButton){
                addToCartButton.removeAttribute('disabled');
            }
            let addToCartForm = document.getElementById('AddToCartForm');
            if( addToCartForm ){
                for (const addVariantButton of addVariantToCartButtons) {
                    addVariantButton.addEventListener('click', function (){
                        let variantId = addVariantButton.getAttribute('variant-id');
                        let data = {
                            id: variantId,
                            quantity: 1
                        }
                        this.addProductToCart(data);
                    }.bind(this));
                }
                addToCartForm.addEventListener('submit', function (event) {
                    event.preventDefault();
                    let data = Object.fromEntries(new FormData(event.target));
                    this.addProductToCart(data);
                }.bind(this));
            }
        },
    },

    popup: {
        open: function(popupElement){
            let imageSrc = popupElement.getAttribute('popup-image-src');
            let popupContent = document.querySelector('#main-popup .popup-content');
            popupContent.innerHTML = '<img src="'+imageSrc+'">'
            document.getElementById('main-popup').style.display = 'flex';
        },
        close: function (){
            let closePopupButton = document.getElementById('close-main-popup');
            closePopupButton.addEventListener('click', function (){
                document.getElementById('main-popup').style.display = 'none';
            });
        },
        init: function(){
            let popupElements = document.getElementsByClassName('open-popup');
            for (const popupElement of popupElements) {
                popupElement.addEventListener('click', function (e){
                    e.preventDefault();
                    this.open(popupElement);
                }.bind(this));
            }
            this.close();
        }
    },

    mobileMenu: {
        init: function (){
            let toggleMobileMenuButton = document.getElementById('sandwich');
            let toggleContent = document.getElementById('mobile-toggle-content');
            toggleMobileMenuButton.addEventListener('click', function (){
                toggleMobileMenuButton.classList.toggle('active');
                toggleContent.classList.toggle('active');
            })
        }
    },

    cartDrawer: {
        elements: {
            cartDrawer: document.getElementById('cart-drawer'),
            cartDrawerForm: document.getElementById('cart-drawer-form'),
            cartDrawerContainer: document.getElementById('cart-drawer-container'),
            drawerProducts: document.getElementById('cart-drawer-products'),
            buttonOpenElements: document.getElementsByClassName('open-cart-drawer'),
            buttonClose: document.getElementById('close-cart-drawer'),
            subTotalPrice: document.getElementById('cart-drawer-sub-total'),
            cartCountElements: document.getElementsByClassName('cart-count'),
        },
        open: function (){
            this.elements.cartDrawer.classList.add('opened');
        },
        close: function (){
            this.elements.cartDrawer.classList.remove('opened');
        },
        update: {
            event: function (){
                let qtyTriggers = theme.cartDrawer.elements.cartDrawerForm.getElementsByClassName('trigger');
                for (const qtyTrigger of qtyTriggers) {
                    qtyTrigger.addEventListener('click', function (){
                        this.action(qtyTrigger);
                    }.bind(this));
                }
            },
            action: function (qtyTrigger){
                let id = qtyTrigger.getAttribute('item-id');
                let value = qtyTrigger.getAttribute('value');
                let data = {
                    updates: {
                        [id]: Number(value)
                    }
                };
                theme.cart.updateCart(data, function (cart){
                    theme.cartDrawer.render(cart);
                });
            }
        },
        remove: {
            event: function (){
                let removeInputs = theme.cartDrawer.elements.cartDrawerForm.getElementsByClassName('remove-cart-item');
                for (const removeInput of removeInputs) {
                    let line = removeInput.getAttribute('line');
                    removeInput.addEventListener('click', function(){
                        let data = {
                            line: Number(line),
                            quantity: 0
                        }
                        this.action(data);
                    }.bind(this));
                }
            },
            action: function (data){
                console.log('start remove')
                theme.cart.removeCartItem(data, function (data){
                    console.log('removed');
                    console.log(data)
                    theme.cartDrawer.render(data);
                });
            }
        },
        cartCountUpdate: function (item_count){
            for (const cartCountElement of this.elements.cartCountElements) {
                if( item_count > 0 ) {
                    cartCountElement.innerText = item_count;
                    cartCountElement.style.display = 'flex';
                }else{
                    cartCountElement.style.display = 'none';
                }
            }
        },
        render: function (cart){
            let drawerProductsTemplate = '';
            for (const index in cart.items) {
                drawerProductsTemplate += this.cartItemTemplate(cart.items[index], index);
            }
            this.elements.drawerProducts.innerHTML = drawerProductsTemplate;
            this.elements.subTotalPrice.innerText = Shopify.formatMoney(cart.total_price, Shopify.money_format);
            this.cartCountUpdate(cart.item_count);

            this.update.event();
            this.remove.event();
            this.open();

        },
        cartItemTemplate: function (item, index){
            let cartItemTemplate = `
            <div class="cart-item">
                  <a class="cart-item-image" href="${item.url}">
                        <img src="${item.image}" alt="${item.title}">
                  </a>
                  <div class="cart-item-info">
                        <a href="${item.url}" class="cart-item-title">${item.title}</a>
                        <div class="remove-cart-item" line="${++index}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <path d="M19.9001 2.9201L12.8201 10.0001L19.9001 17.0801L17.0801 19.9001L10.0001 12.8401L2.9401 19.9001L0.100098 17.0601L7.1601 10.0001L0.100098 2.9401L2.9401 0.100098L10.0001 7.1601L17.0801 0.100098L19.9001 2.9201Z" fill="white"/>
                            </svg>
                        </div>
                        <div class="cart-item-price">${Shopify.formatMoney(item.price, Shopify.money_format)}</div>
                        <div class="cart-item-qty-wrapper">
                            <div class="minus-one trigger"
                                item-id="${item.id}"
                                value="${item.quantity - 1}"><span>–</span></div>
                            <input type="number" class="input-qty"
                                name="updates[${item.id}]"
                                value="${item.quantity}"
                                min="0">
                            <div class="plus-one trigger"
                                item-id="${item.id}"
                                value="${item.quantity + 1}">+</div>
                        </div>
                  </div>
            </div>`;
            return cartItemTemplate;
        },
        init: function (){
            for (const buttonOpen of this.elements.buttonOpenElements) {
                buttonOpen.addEventListener('click', function (){
                    this.open();
                }.bind(this));
            }

            this.elements.buttonClose.addEventListener('click', function () {
                this.close();
            }.bind(this));

            // if click outside cartDrawerContainer
            this.elements.cartDrawer.addEventListener('click', function(e) {
                let isClickInside = this.elements.cartDrawerContainer.contains(e.target);
                if (!isClickInside) {
                    this.close();
                }
            }.bind(this));
            this.update.event();
            this.remove.event();
        }
    },

    slidersInit: function(){
        const collectionNavSlider = new Swiper('#collection-navigation-slider', {
            slidesPerView: 'auto',
            centerInsufficientSlides: 'true',
        });
        const testimonialsSlider = new Swiper('#testimonials-slider', {
            pagination: {
                el: '.swiper-pagination',
                clickable: true
            },
            navigation: {
                nextEl: '#testimonials-slider-next',
                prevEl: '#testimonials-slider-prev',
            }
        });
        const recommendationsSlider = new Swiper('#product-recommendations-slider', {
            slidesPerView: 1,
            spaceBetween: 15,
            pagination: {
                el: '.swiper-pagination',
                clickable: true
            },
            navigation: {
                nextEl: '#recommendations-slider-next',
                prevEl: '#recommendations-slider-prev',
            },
            breakpoints: {
                768: {
                    slidesPerView: 2,
                },
                992: {
                    slidesPerView: 3,
                }
            }
        });

        const galleryThumbs = new Swiper('.gallery-thumbs', {
            spaceBetween: 15,
            slidesPerView: 4,
            freeMode: true,
            watchSlidesVisibility: true,
            watchSlidesProgress: true,
        });
        const galleryTop = new Swiper('.gallery-top', {
            spaceBetween: 0,
            thumbs: {
                swiper: galleryThumbs
            }
        });
    },

    init: function (){
        this.mobileMenu.init();
        this.popup.init();
        this.product.init();
        this.collection.init();
        this.cartDrawer.init();
        this.slidersInit();
    },
}
window.theme = theme || {};
theme.init();
