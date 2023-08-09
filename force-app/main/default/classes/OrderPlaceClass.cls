public with sharing class OrderPlaceClass {
    @AuraEnabled
    public static Id createOrderRecord(Order order) {
        try {
            insert order;
            return order.Id;
        } catch (Exception ex) {
            throw new AuraHandledException('Error creating Order: ' + ex.getMessage());
        }
    }

    @AuraEnabled
    public static void createOrderProducts(Id orderId, List<String> productIds, List<Integer> quantities, Id pricebookId) {
        try {
            List<OrderItem> orderItems = new List<OrderItem>();
            // Pricebook2 pb = [SELECT Id FROM Pricebook2 WHERE Id = :pricebookId];
            for (Integer i = 0; i < productIds.size(); i++) {
                String productId = productIds[i];
                Decimal unitPrice = [SELECT UnitPrice FROM PricebookEntry WHERE Product2Id = :productId AND Pricebook2Id = :pricebookId LIMIT 1].UnitPrice;
                OrderItem newItem = new OrderItem();
                newItem.OrderId = orderId;
                newItem.Product2Id = productId;
                newItem.Quantity = quantities[i];
                newItem.UnitPrice = unitPrice;
                newItem.ListPrice = unitPrice;
                newItem.PricebookEntryId = [SELECT Id FROM PricebookEntry WHERE Product2Id = :productId AND Pricebook2Id = :pricebookId LIMIT 1].Id;
                orderItems.add(newItem);
            }
            insert orderItems;
        } catch (Exception ex) {
            throw new AuraHandledException('Error creating Order Products: ' + ex.getMessage());
        }
    }
}
