@epic:Banking @feature:Transfers @severity:critical
Feature: Transfer between accounts
  Customers can move money between their own accounts.

  Background:
    Given I am signed in as the demo user
    And I visit the transfer page

  Scenario: Successful transfer
    When I transfer 100 from "Rainy Day Savings" to "Everyday Checking" with memo "Top-up"
    Then the transfer success message matches "transferred \$100\.00"

  Scenario: Transfer to the same account is rejected
    When I transfer 50 from "Everyday Checking" to "Everyday Checking"
    Then the transfer error matches "must differ"

  Scenario: Transfer exceeding balance is rejected
    When I transfer 9999999 from "Everyday Checking" to "Rainy Day Savings"
    Then the transfer error matches "insufficient funds"
