public with sharing class AddProduct {
    
    @AuraEnabled(cacheable=true)
    public static List<ProductWrapper> getProducts() {
        List<ProductWrapper> productWrappers = new List<ProductWrapper>();
        
        List<Product2> products = [SELECT Id, Name, ProductCode, Image_URL__c, Description, Family FROM Product2];
        Map<Id, List<PricebookEntry>> productToPricebookEntriesMap = new Map<Id, List<PricebookEntry>>();
        
        for (Product2 product : products) {
            productWrappers.add(new ProductWrapper(product));
        }
        
        List<PricebookEntry> pricebookEntries = [SELECT Id, Product2Id, Pricebook2.Name, UnitPrice FROM PricebookEntry WHERE Product2Id IN :products];
        
        for (PricebookEntry entry : pricebookEntries) {
            if (productToPricebookEntriesMap.containsKey(entry.Product2Id)) {
                productToPricebookEntriesMap.get(entry.Product2Id).add(entry);
            } else {
                productToPricebookEntriesMap.put(entry.Product2Id, new List<PricebookEntry>{ entry });
            }
        }
        
        for (ProductWrapper wrapper : productWrappers) {
            if (productToPricebookEntriesMap.containsKey(wrapper.product.Id)) {
                wrapper.pricebookEntries = productToPricebookEntriesMap.get(wrapper.product.Id);
            }
        }
        
        return productWrappers;
    }
    
    public class ProductWrapper {
        @AuraEnabled public Product2 product;
        @AuraEnabled public List<PricebookEntry> pricebookEntries;
        
        public ProductWrapper(Product2 product) {
            this.product = product;
        }
    }
}