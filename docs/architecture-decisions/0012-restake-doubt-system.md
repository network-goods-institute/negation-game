# ADR-012: Epistemic Leverage System Architecture

## Date: 2025-03-17

## Status

Accepted

## Context

The Negation Game platform is built around a system of points, counterpoints (negations), and user interactions that signal confidence or skepticism about arguments. To extend this core functionality and create a more dynamic and engaging platform, we needed mechanisms that would:

1. Allow users to stake their reputation on the potential impact of counterarguments
2. Enable users to signal commitment to changing their mind if certain conditions are met
3. Create opportunities for users to challenge others' intellectual honesty
4. Provide economic incentives for rational behavior and honest discourse

The traditional endorsement system (staking on points) was insufficient for these goals as it lacked the commitment aspect and the ability to express conditional changes of opinion.

## Decision

We've implemented an Epistemic Leverage System with the following characteristics:

### Restake System

1. **Commitment Mechanism**: Users can "restake" on a point-negation pair, committing to change their mind about a parent point IF the negation proves true.

2. **Economic Model**: 
   - Restaking costs cred immediately upon placement
   - Grants a favor bonus to the parent point
   - Favor bonus is reduced by max(slashed, doubted) amounts
   - Cannot be increased after placement, only decreased (slashed)

3. **Slashing Mechanism**:
   - Users can slash their own restakes to admit the negation changed their mind
   - Slashing removes the favor bonus proportionally
   - Slashing can be partial or complete
   - Costs no additional cred

### Doubt System

1. **Challenge Mechanism**: Users can "doubt" others' restakes, betting they won't follow through on their commitment.

2. **Economic Model**:
   - Doubting is limited by the total restake amount
   - Doubts are immutable once placed
   - Multiple doubts share proportional losses
   - Doubts win if restakers don't slash

3. **Incentive Structure**:
   - Forces restakers to choose between ego and intellectual integrity
   - Creates accountability for commitments
   - Rewards honest behavior

### Implementation Details

1. **Database Structure**:
   - Restakes and doubts are stored with point-negation pairs
   - Effective amounts are calculated accounting for both slashes and doubts
   - Views provide pre-calculated totals for efficient querying

2. **UI Representation**:
   - Icons with fill states indicate ownership and amounts
   - Visibility rules hide fully slashed restakes
   - Dialog handles the three modes: restaking, slashing, and doubting

3. **Favor Calculation**:
   - Base favor from point/negation cred ratio
   - Restake bonus added to parent point
   - Bonus reduced by max(slashed, doubted)

## Consequences

### Positive

- Creates a more dynamic and engaging platform
- Encourages intellectual honesty through economic incentives
- Provides a mechanism for users to signal changing opinions
- Adds strategic depth to interactions
- Allows for more nuanced expressions of confidence

### Negative

- Increased complexity in both the UI and backend
- Additional database tables and calculations
- More complex state transitions to test and maintain
- Potential for confusion among new users
- Requires careful balance of economic incentives

## Mitigation Strategy

1. **Clear UI Feedback**: Visual cues and tooltips to explain the system
2. **Comprehensive Testing**: Unit tests for state transitions and calculations
3. **Documentation**: Clear explanations of the rules in help sections
4. **Gradual Introduction**: Progressive disclosure of features as users engage more deeply

## Future Considerations

1. Potential refinements to the economic models based on user behavior
2. Additional visualizations of restake and doubt relationships
3. Analytics to measure the effectiveness of the system in promoting honest discourse
4. Potential for more granular commitments or conditional restakes 