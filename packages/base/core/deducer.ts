import { Architecture } from "../arch";
import { BaseComponent, BasicArgs } from "./base-component";

export interface NewDeducerArgs extends BasicArgs {}

export interface DeduceResult {
  /** The result of deducing. */
  readonly archRef: Architecture;
}

export abstract class Deducer extends BaseComponent {
  constructor(args: NewDeducerArgs) {
    super(args);
  }

  /**
   * Deduce the architecture of the application.
   * @param entrypoints The program entrypoints, including main file and test files.
   */
  public abstract deduce(entrypoints: string[]): Promise<DeduceResult>;
}
