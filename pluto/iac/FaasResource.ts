export abstract class FaasResource extends ComponentResource {
    public abstract grantPermission(op: string, resourceArn: string): void;
}