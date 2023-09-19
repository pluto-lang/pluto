import { assert } from "console";

type ClsType = { new(...args: any[]): any }

export interface IRegistry {
    register(rtType: string, resType: string, cls: ClsType): void;

    getResourceDef(rtType: string, resType: string): ClsType;
}

export class Registry implements IRegistry {
    readonly store: { [resType: string]: { [rtTyp: string]: ClsType } } = {}

    public register(rtType: string, resType: string, cls: ClsType): void {
        rtType = rtType.toUpperCase();
        if (!(resType in this.store)) {
            this.store[resType] = {};
        }
        assert(!(rtType in this.store[resType]));

        this.store[resType][rtType] = cls;
    }

    public getResourceDef(rtType: string, resType: string): ClsType {
        rtType = rtType.toUpperCase();
        if (!(resType in this.store) || !(rtType in this.store[resType])) {
            throw new Error(`cannot the resource definition '${rtType} - ${resType}'`);
        }
        return this.store[resType][rtType];
    }
}