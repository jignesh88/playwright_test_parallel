@epic:Banking @feature:Authentication @severity:blocker
Feature: Login
  Customers can sign in to RetailFlow Bank with their credentials.

  Scenario: Reject invalid credentials
    Given I am on the login page
    When I sign in as "demo" with password "wrong-password"
    Then I see a login error matching "invalid"

  Scenario: Sign in successfully
    Given I am on the login page
    When I sign in as "demo" with password "password123"
    Then I land on the account page for "Demo User"
