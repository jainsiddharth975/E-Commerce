
import { LightningElement, track, wire } from 'lwc';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import getProducts from '@salesforce/apex/AddProduct.getProducts';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import createOrderProducts from '@salesforce/apex/OrderPlaceClass.createOrderProducts';
import createOrderRecord from '@salesforce/apex/OrderPlaceClass.createOrderRecord';
import ACCOUNT_FIELD from '@salesforce/schema/Contract.AccountId';
import CONTRACT_END_DATE_FIELD from '@salesforce/schema/Contract.EndDate';
import CONTRACT_START_DATE_FIELD from '@salesforce/schema/Contract.StartDate';


import ACCOUNT_NAME_FIELD from '@salesforce/schema/Account.Name';
import AUTHORIZED_BY_ID from '@salesforce/schema/Contact.Name';
import CONTRACT_NUMBER_FIELD from '@salesforce/schema/Contract.ContractNumber';
import PRICEBOOK_NAME_FIELD from '@salesforce/schema/Pricebook2.Name';


// Define the columns for the product datatable
const columns = [
  { label: 'Product Name', fieldName: 'Name', type: 'text' },
  { label: 'Product Code', fieldName: 'ProductCode', type: 'text' },
  { label: 'List Price', fieldName: 'UnitPrice', type: 'currency' },
  { label: 'Product Description', fieldName: 'Description', type: 'text' },
  { label: 'Product Family', fieldName: 'Family', type: 'text' }

];

// Define the columns for the selected product datatable
const selectedColumns = [
  { label: 'Product', fieldName: 'Name', type: 'text' },
  { label: 'Quantity', fieldName: 'Quantity', type: 'number', editable: true },
  { label: 'Unit Price', fieldName: 'UnitPrice', type: 'currency' },
  { label: 'List Price', fieldName: 'UnitPrice', type: 'currency' },
  { label: 'Line Description', fieldName: 'Description', type: 'text', editable: true }
];

// Define the columns for the final selected product datatable
const finalSelectedColumns = [
  { label: 'Product Name', fieldName: 'Name', type: 'text' },
  { label: 'Product Code', fieldName: 'ProductCode', type: 'text' },
  { label: 'Unit Price', fieldName: 'UnitPrice', type: 'currency' },
  { label: 'Quantity', fieldName: 'Quantity', type: 'number' },
  { label: 'Total Price', fieldName: 'TotalPrice', type: 'currency' },
  { label: 'Price Book Entry', fieldName: 'PriceBookEntryId', type: 'text' }

];

export default class E_Commerce extends LightningElement {

  // Define the component's state variables
  @track order = {
    Status: 'Draft'
  };

  // Define variables to control the visibility of different sections
  @track showOrderCard = true;
  @track showProductCard = false;
  @track showSelectedProduct = false;
  @track showPreviewCard = false;
  @track showEnteredOrderDetailsCard = false;

  // datatable's data and column
  columns = columns;
  products;

  selectedColumns = selectedColumns;
  @track selectedProducts = [];


  @track finalSelectedProducts = [];
  finalSelectedColumns = finalSelectedColumns;

  //other variables
  accNameOptions = [];
  contractNumberOptions = [];
  contactNameOptions = [];
  statusOptions = [];
  @track draftValues = [];
  @track totalPriceSum = 0;
  @track dateError;
  @track contractError;
  //.......................................................................SOURCE CODE...............................................................................................

  //....................ORDER CARD....................

  @wire(getRecord, { recordId: '$order.ContractId', fields: [ACCOUNT_FIELD, CONTRACT_END_DATE_FIELD, CONTRACT_START_DATE_FIELD] })
  contract;

  // ORDER CARD HANDLE CHANGE ACTION PERFORM

  handleChange(event) {
    let fieldName = event.target.fieldName;
    let value = event.target.value;
    this.order[fieldName] = value;
  }

  // clear error message 
  clearErrors() {
    this.dateError = '';
    this.contractError = '';
  }

  // SHOW/HIDE BUTTON ACTION PERFORM
  // NEXT(SHOW PRODUCT CARD ON CLICK)
  handleNextClick() {

    this.clearErrors();

    if (!this.order.AccountId || !this.order.EffectiveDate || !this.order.ContractId || !this.order.CustomerAuthorizedById || !this.order.Status) {
      this.showToast('Error', 'Fill all fields value', 'error');
      return;
    }

    const accountId = getFieldValue(this.contract.data, ACCOUNT_FIELD);
    if (this.order.AccountId !== accountId) {
      // this.showToast('Error', 'Account and Contract do not belong to the same account', 'error');
      this.contractError = 'Account and Contract do not belong to the same account';

      return;
    }

    const contractStartDate = getFieldValue(this.contract.data, CONTRACT_START_DATE_FIELD);
    const contractEndDate = getFieldValue(this.contract.data, CONTRACT_END_DATE_FIELD);
    if (contractStartDate && contractEndDate && (this.order.EffectiveDate < contractStartDate || this.order.EffectiveDate > contractEndDate)) {
      this.dateError = 'Order Start Date should be within the contract period';

      return;
    }

    this.showOrderCard = false;
    this.showProductCard = true;
  }

  //....................PRODUCT CARD....................

  // SHOW/HIDE BUTTON ACTION PERFORM
  // PREVIOUS(SHOW ORDER CARD ON CLICK)
  handlePreviousClick() {
    this.showOrderCard = true;
    this.showProductCard = false;
  }

  // SHOW PRODUCT DETAILS IN DATATABLE
  @wire(getProducts)
  wiredProducts({ error, data }) {
    if (data) {
      this.products = data.map(productWrapper => ({
        ...productWrapper.product,

        UnitPrice: productWrapper.pricebookEntries.length > 0
          ? productWrapper.pricebookEntries[0].UnitPrice
          : null,

        Quantity: 0,

        PriceBookEntryId: productWrapper.pricebookEntries.length > 0
          ? productWrapper.pricebookEntries[0].Id
          : null,

        PriceBookEntry: productWrapper.pricebookEntries.length > 0
          ? productWrapper.pricebookEntries[0]
          : null
      }));
    } else if (error) {

    }
  }

  // SHOW/HIDE BUTTON ACTION PERFORM
  // (SHOW SELECTED PRODUCT IN DATATABLE ON BUTTON CLICK)
  handleAddProducts() {

    const selectedRows = this.template.querySelector('lightning-datatable').getSelectedRows();
    const updatedSelectedProducts = [...this.selectedProducts, ...selectedRows];
    this.selectedProducts = updatedSelectedProducts;

    if (this.selectedProducts.length > 0) {
      this.selectedProductId = this.selectedProducts[0].PriceBookEntryId;
    }

    if (!this.validateSelectedProducts()) {
      this.showToast('Error', 'Select atleast 1 product', 'error');
      return;
    }
    this.showSelectedProduct = true;
    this.showProductCard = false;
  }

  // SHOW/HIDE BUTTON ACTION PERFORM
  // SHOW ADD PRODUCT PAGE ON BUTTON CLICK
  handleBackClick() {
    this.showSelectedProduct = false;
    this.showProductCard = true;
    this.showPreviewCard = false;
  }

  // SHOW/HIDE BUTTON ACTION PERFORM
  // SHOW ADD PREVIEW PAGE ON BUTTON CLICK
  handlePreviewProducts(event) {

    this.showSelectedProduct = false;
    this.showPreviewCard = true;

    let drafts = event.detail.draftValues;
    let draftMap = {};

    drafts.forEach(draft => {
      draftMap[draft.Id] = draft.Quantity;
    });

    this.selectedProducts.forEach(product => {
      product.Quantity = draftMap[product.Id];
    });

    this.selectedProducts.forEach((product) => {
      const totalPrice = product.UnitPrice * product.Quantity;
      product.TotalPrice = totalPrice;
    });

    this.finalSelectedProducts = [...this.selectedProducts];

    this.totalPriceSum = this.finalSelectedProducts.reduce(
      (sum, product) => sum + product.TotalPrice,
      .0
    );
  }

  //....................ORDER LAYOUT VALUE....................
  @wire(getRecord, { recordId: '$order.AccountId', fields: [ACCOUNT_NAME_FIELD] })
  account;

  @wire(getRecord, { recordId: '$order.CustomerAuthorizedById', fields: [AUTHORIZED_BY_ID] })
  contact;

  @wire(getRecord, { recordId: '$order.ContractId', fields: [CONTRACT_NUMBER_FIELD] })
  contractRecord;

  @wire(getRecord, { recordId: '$order.Pricebook2Id', fields: [PRICEBOOK_NAME_FIELD] })
  pricebookRecord;

  get accountName() {
    return getFieldValue(this.account.data, ACCOUNT_NAME_FIELD);
  }
  get CustomerAuthorizedById() {
    return getFieldValue(this.contact.data, AUTHORIZED_BY_ID);
  }

  get contractNumber() {
    return getFieldValue(this.contractRecord.data, CONTRACT_NUMBER_FIELD);
  }

  get pricebookName() {
    return getFieldValue(this.pricebookRecord.data, PRICEBOOK_NAME_FIELD);
  }

  //....................VALIDATIONS....................
  validateProductDetails() {
    return true;
  }

  validateSelectedProducts() {
    if (this.selectedProducts.length === 0) {
      return false;
    }
    return true;
  }

  //....................ADD TO CARD....................
  handleAddToCart() {

    createOrderRecord({ order: this.order })
      .then((result) => {
        const orderId = result;
        this.showToast('Success', 'Order created successfully', 'success');

        const pricebookId = this.order.Pricebook2Id;
        const productIds = this.finalSelectedProducts.map((product) => product.Id);
        const quantities = this.finalSelectedProducts.map((product) => product.Quantity);

        createOrderProducts({ orderId, productIds, quantities, pricebookId })
          .then(() => {
            this.showToast(
              'Success',
              'Order products created successfully',
              'success'
            );
            this.handleCancle();
          })
          .catch((error) => {
            this.showToast(
              'Error',
              'An error occurred while trying to create order products',
              'error'
            );
            console.error('Error creating order products:', error);
          });
      })
      .catch((error) => {
        this.showToast(
          'Error',
          'An error occurred while trying to create the Order record',
          'error'
        );
        console.error('Error creating Order:', error);
      });
  }

  //....................CANCLE BUTTON....................
  handleCancle() {
    this.showPreviewCard = false;
    this.showOrderCard = true;

    // Reset order object and other relevant variables
    this.order = {
      Status: 'Draft'
    };
    this.selectedProducts = [];
    this.finalSelectedProducts = [];
    this.draftValues = [];
    this.totalPriceSum = 0;
  }

  //....................SHOW TOAST....................
  showToast(title, message, variant) {
    const event = new ShowToastEvent({
      title: title,
      message: message,
      variant: variant
    });
    this.dispatchEvent(event);
  }

}