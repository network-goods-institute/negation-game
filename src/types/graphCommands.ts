export type GraphCommandType = 
  | 'add_point'
  | 'update_point' 
  | 'delete_point'
  | 'add_edge'
  | 'update_edge'
  | 'delete_edge'
  | 'update_statement'
  | 'set_cred'
  | 'mark_objection'
  | 'unmark_objection';

export interface BaseGraphCommand {
  id: string;
  type: GraphCommandType;
}

export interface AddPointCommand extends BaseGraphCommand {
  type: 'add_point';
  nodeId: string;
  content: string;
  parentId?: string; // For hierarchy context
  cred?: number;
  isObjection?: boolean;
  objectionTargetId?: number;
  objectionContextId?: number;
}

export interface UpdatePointCommand extends BaseGraphCommand {
  type: 'update_point';
  nodeId?: string; // Optional for flexibility 
  content?: string;
  cred?: number;
}

export interface DeletePointCommand extends BaseGraphCommand {
  type: 'delete_point';
  nodeId?: string; // Optional for flexibility
}

export interface AddEdgeCommand extends BaseGraphCommand {
  type: 'add_edge';
  edgeId: string;
  source: string;
  target: string;
  edgeType: 'statement' | 'negation';
}

export interface UpdateEdgeCommand extends BaseGraphCommand {
  type: 'update_edge';
  edgeId?: string;
  source: string;
  target: string;
  edgeType: 'statement' | 'negation';
}

export interface DeleteEdgeCommand extends BaseGraphCommand {
  type: 'delete_edge';
  edgeId?: string; // Optional for flexibility
}

export interface UpdateStatementCommand extends BaseGraphCommand {
  type: 'update_statement';
  statement?: string;
  title?: string; // Allow both for flexibility
}

export interface SetCredCommand extends BaseGraphCommand {
  type: 'set_cred';
  nodeId: string;
  cred: number;
}

export interface MarkObjectionCommand extends BaseGraphCommand {
  type: 'mark_objection';
  nodeId: string;
  objectionTargetId: number;
  objectionContextId: number;
}

export interface UnmarkObjectionCommand extends BaseGraphCommand {
  type: 'unmark_objection';
  nodeId: string;
}

export type GraphCommand = 
  | AddPointCommand
  | UpdatePointCommand
  | DeletePointCommand
  | AddEdgeCommand
  | UpdateEdgeCommand
  | DeleteEdgeCommand
  | UpdateStatementCommand
  | SetCredCommand
  | MarkObjectionCommand
  | UnmarkObjectionCommand;

export interface GraphCommandResponse {
  commands: GraphCommand[];
  explanation?: string;
}