@epic:Banking @feature:Accounts @severity:critical
Feature: Accounts
  Authenticated customers can open additional bank accounts.

  Background:
    Given I am signed in as the demo user

  Scenario: Open a new savings account
    When I visit the accounts page
    And I open a "savings" account named "Holiday Fund"
    Then the new-account success message contains "Holiday Fund"
    And the accounts table contains "Holiday Fund"

  Scenario: Reject account with blank name
    When I visit the accounts page
    And I open a "checking" account named "   "
    Then the new-account error matches "name is required"
