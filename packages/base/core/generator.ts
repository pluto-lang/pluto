import { LanguageType } from "../language";
import { Architecture } from "../arch";
import { BaseComponent, BasicArgs } from "./base-component";

export interface NewGeneratorArgs extends BasicArgs {
  readonly language: LanguageType;
}

export interface GenerateResult {
  /** The entrypoint of generated files. */
  readonly entrypoint?: string;
}

export abstract class Generator extends BaseComponent {
  protected language: LanguageType;

  constructor(args: NewGeneratorArgs) {
    super(args);
    this.language = args.language;
  }

  /**
   * Generate some files based on the given architecture.
   * @param archRef The architecture of the application.
   * @param outdir The base directory to write the files to.
   */
  public abstract generate(archRef: Architecture, outdir: string): Promise<GenerateResult>;
}
