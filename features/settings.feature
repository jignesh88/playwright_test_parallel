@epic:Banking @feature:Settings @severity:normal
Feature: Notification settings
  Customers can configure which notification channels they receive.

  Background:
    Given I am signed in as the demo user

  Scenario: Persist channel preferences
    When I visit the settings page
    And I enable the "sms" channel
    And I disable the "marketing" channel
    And I save settings
    Then settings are saved
    When I visit the settings page
    Then the "sms" channel is enabled
    And the "marketing" channel is disabled
