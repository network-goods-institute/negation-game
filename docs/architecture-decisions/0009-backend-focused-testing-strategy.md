# 9. Backend-Focused Testing Strategy

Date: 2025-03-14

## Status

Accepted

## Context

As our application grows in complexity, implementing comprehensive automated testing becomes essential to ensure reliability and maintainability. However, with limited resources and a focus on delivering new features, we need to prioritize our testing efforts.

Our codebase currently has minimal test coverage with a basic Jest setup. We have some test utilities configured and UI component tests, but very limited backend testing. Given the application's architecture:

1. The frontend is heavily dependent on the backend for data and business logic
2. Backend server actions handle the core functionality of the application
3. Backend failures affect all users, while frontend issues might only affect specific UI scenarios

We need to make strategic decisions about testing priorities to balance development speed with reliability.

## Decision

We've decided to focus primarily on backend testing, with the following approach:

1. **Backend Testing Priority**: 
   - New features will require tests for server actions and database operations
   - Critical business logic will be tested thoroughly
   - API endpoints will have integration tests where appropriate

2. **Frontend Testing Approach**:
   - Frontend tests will be implemented sparingly, if at all
   - Priority for any frontend tests will be on critical user flows
   - We will rely more on manual testing for UI components.
   - Regression testing will be done manually, in regards to new features.

3. **Gradual Improvement**:
   - We will implement backend tests for existing features over time
   - Test coverage will be gradually increased during refactoring
   - We'll continue to evaluate this approach and adjust as needed

We will use Jest as our primary testing framework, with additional tools for backend testing as needed.

Additionaly, we have introduced a rudimentary CI/CD pipeline to run tests on every pull request, and commit. Failures will block test passing PRs.

## Consequences

### Positive

- More efficient use of development resources
- Focus on testing the most critical parts of the application
- Reduced risk of backend regressions
- Clearer expectation for developers about testing requirements

### Negative

- Risk of frontend regressions remains higher
- UI components may have inconsistent behavior across the application
- Some frontend issues might not be caught until reaching production
- Additional manual testing burden for UI changes

We acknowledge these tradeoffs as necessary given our current priorities and resources. As the application matures, we may revisit this decision and expand our testing coverage to include more frontend testing. 