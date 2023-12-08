import { Stack } from "../config";

export interface BasicArgs {
  /** The project name. */
  readonly project: string;
  /** The stack specified by user. */
  readonly stack: Stack;
  /** The root directory path of the current project. */
  readonly rootpath: string;
  readonly log?: (...data: any[]) => void;
}

export abstract class BaseComponent {
  protected readonly project: string;
  protected readonly stack: Stack;
  protected readonly rootpath: string;
  protected readonly log?: (...data: any[]) => void;

  constructor(args: BasicArgs) {
    this.project = args.project;
    this.stack = args.stack;
    this.rootpath = args.rootpath;
    this.log = args.log;
  }

  public abstract get name(): string;
  public abstract get version(): string;
}
