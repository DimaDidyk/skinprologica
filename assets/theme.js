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
                $.getJSON('/collections/' + collectionHandle + '/products.json', resolve);
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
                console.log(collectionHandle);

                theme.getCollectionProducts(collectionHandle).then(function (collection) {
                    const tabsObject = _this.getTabsObject();
                    const productByTab = _this.getProductsByTab(collection.products, tabsObject);
                    let collectionTemplate = '';
                    for (const tabContent of productByTab) {
                        if( tabContent.products.length > 0 ){
                            collectionTemplate += _this.getTemplate.collectionTab(tabContent);
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
            productGridItem: function (product){
                let text = '';
                for (const tag of product.tags) {
                    if(tag.includes('text__')){
                        text = tag.replace('text__', '');
                    }
                }
                return `
            <div class="product-grid-item">
                <a href="/products/${ product.handle }">
                    <span class="img-wrap">
                        <img class="product-img"
                             src="${ product.images[0].src }}"
                             alt="${ product.title }" />
                        </span>
                        <span class="product-info">
                        <div class="product-title">${ product.title }</div>
                        <div class="some-text"><b>${ text }</b></div>
                        <div class="product-price"><strong>$${ product.variants[0].price }</strong></div>
                        <span class="desc">${ this.stripHtml(product.body_html) }</span>
                    </span>
                </a>
            </div>`
            },
            collectionTab: function (tabContent){
                let tabTemplate = `
                <div class="product-tab unselectable">
                    <div class="product-tab-heading align-center">
                        <h3 class="heading">${tabContent.title}</h3>
                    </div>
                    <div class="product-tab-content">
                        <div class="product-grid">`;

                for (const product of tabContent.products) {
                    tabTemplate += this.productGridItem(product);
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
        init: function (){
            this.productTabs();

            let addToCartButton = document.getElementById('AddToCart');
            if (addToCartButton){
                addToCartButton.removeAttribute('disabled');
            }

            let addToCartForm = document.getElementById('AddToCartForm');
            if( addToCartForm ){
                addToCartForm.addEventListener('submit', function (event) {
                    event.preventDefault();
                    let data = Object.fromEntries(new FormData(event.target));
                    theme.cart.addToCart(data, function (){
                        theme.cart.getCart(function (cart){
                            theme.cartDrawer.render(cart);
                        });
                    }, function (err){
                        console.log(err);
                    });
                }.bind(this));
            }
        }
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
            buttonOpen: document.getElementById('open-cart-drawer'),
            buttonClose: document.getElementById('close-cart-drawer'),
            subTotalPrice: document.getElementById('cart-drawer-sub-total'),
        },
        open: function (){
            this.elements.cartDrawer.classList.add('opened');
        },
        close: function (){
            this.elements.cartDrawer.classList.remove('opened');
        },
        update: {
            event: function (){
                let quantityInputs = theme.cartDrawer.elements.cartDrawerForm.getElementsByClassName('input-qty');
                for (const quantityInput of quantityInputs) {
                    quantityInput.addEventListener('change', function (){
                        this.action();
                    }.bind(this));
                }
            },
            action: function (){
                const data = this.getData();
                console.log(data);
                theme.cart.updateCart(data, function (cart){
                    theme.cartDrawer.render(cart);
                });
            },
            getData: function (){
                let quantityInputs = theme.cartDrawer.elements.cartDrawerForm.getElementsByClassName('input-qty');
                let data = {updates: {}};
                for (const quantityInput of quantityInputs) {
                    let id = quantityInput.getAttribute('item-id');
                    data.updates[id] = Number(quantityInput.value);
                }
                return data;
            },
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
        render: function (cart){
            let drawerProductsTemplate = '';
            for (const index in cart.items) {
                drawerProductsTemplate += this.cartItemTemplate(cart.items[index], index);
            }
            this.elements.drawerProducts.innerHTML = drawerProductsTemplate;
            this.elements.subTotalPrice.innerText = Shopify.formatMoney(cart.total_price, Shopify.money_format);
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
                        <input type="number" class="input-qty"
                                name="updates[${item.id}]"
                                id="updates_${ item.key }"
                                item-id="${item.id}"
                                value="${item.quantity}"
                                min="0">
                  </div>
            </div>`;
            return cartItemTemplate;
        },
        init: function (){
            this.elements.buttonOpen.addEventListener('click', function (){
                this.open();
            }.bind(this));
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

    init: function (){
        this.mobileMenu.init();
        this.popup.init();
        this.product.init();
        this.collection.init();
        this.cartDrawer.init();
    },
}
window.theme = theme || {};
theme.init();
