@epic:Banking @feature:Loans @severity:normal
Feature: Loan applications
  Customers can apply for personal loans with automated decisioning.

  Background:
    Given I am signed in as the demo user
    And I visit the loans page

  Scenario Outline: Loan decisioning by amount
    When I apply for a loan of <amount> over <term> months for "<purpose>"
    Then the loan application is "<status>"

    Examples:
      | amount | term | purpose  | status       |
      | 2000   | 24   | New bike | approved     |
      | 25000  | 60   | Car      | under_review |
      | 200000 | 60   | House    | rejected     |

  Scenario: Reject loans below the minimum
    When I apply for a loan of 100 over 12 months for "Too small"
    Then the loan error matches "at least 500"
