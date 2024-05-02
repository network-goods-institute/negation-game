import { Negation } from "../entities/Negation";
import { Point } from "../entities/Position";
import { WithEndorsements } from "../utils/WithEndorsements";

export interface Graph {
  points: WithEndorsements<Point>[];
  negations: WithEndorsements<Negation>[];
}
