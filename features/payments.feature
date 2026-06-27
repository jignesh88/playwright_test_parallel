@epic:Banking @feature:Payments @severity:critical
Feature: Bill payments
  Customers can pay bills via ACH, card, or wire.

  Background:
    Given I am signed in as the demo user
    And I visit the payments page

  Scenario Outline: Pay a bill
    When I pay "<payee>" <amount> via "<paymentType>"
    Then the payment is successful

    Examples:
      | payee      | amount | paymentType |
      | City Power | 42.50  | ach         |
      | Telco      | 19.99  | card        |

  Scenario: Reject payment over balance
    When I pay "Mega Corp" 9999999 via "wire"
    Then the payment error matches "insufficient funds"
