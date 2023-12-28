# Differences between Pluto and other Products

## Differences from BaaS-like Products

Typical products: Supabase, Appwrite.

In the BaaS field, products that focus on this area typically provide self-managed databases, file storage, and other components. Users can create instances of these components in the backend and provide corresponding client SDKs to access these instances. Additionally, these products may also offer backend data visualization capabilities.

If you are not concerned about vendor lock-in and do not have concerns about service deployment, BaaS products can provide a good development experience. You can easily create instances of components like databases and only need to focus on calling these components in your code.

In comparison, Pluto helps developers create their own infrastructure environment within their own accounts on the target cloud platform. At the same time, Pluto provides the same development experience as BaaS products.

## Differences from PaaS-like Products

Typical products: Fly.io, render, Heroku.

Compared to PaaS products like Fly.io, render, and Heroku, Pluto doesn't focus on container hosting but compiles and generates more granular compute modules to leverage capabilities like FaaS provided by cloud platforms. The resource components it relies on are directly deduced from user code, eliminating the need for users to write additional configuration code.

## Differences from Scaffolding Tools

Typical products: Serverless Framework, Serverless Devs.

Compared to scaffolding tools like Serverless Framework and Serverless Devs, Pluto does not provide application programming frameworks specific to cloud vendors or specific frameworks. Instead, it provides a consistent programming interface for users, utilizing language technology to generate compute modules that are compatible with cloud vendors. Pluto also supports migration between cloud platforms without modifying code.

## Differences from IfC-like Products

### Pure annotation IfC-like Products

Typical product: Klotho.

Compared to Klotho and other pure annotation-based Infra from Code (IfC) products, Pluto directly deduces resource dependencies from user code, providing a more consistent development experience. Additionally, the dependency mechanism of the programming language brings higher horizontal scalability.

### SDK-based IfC-like Products

Typical products: Shuttle, Nitric.

Compared to Shuttle, Nitric, and other SDK-based Infra from Code (IfC) products, Pluto does not obtain resource dependencies by executing user code at compile-time. Instead, it statically infers user code to obtain the dependencies.

### Language-based IfC-like Products

Typical product: Winglang.

Both Winglang and Pluto belong to language-based IfC products. However, compared to Winglang, Pluto generates Infrastructure as Code (IaC) code independent of user code. This decoupling enables users to focus on coding without having to be aware of the differences between compile-time and runtime.

Therefore, the key difference between Pluto and other products is that Pluto directly deduces resource dependencies from user code using programming language technology, generating IaC code that is independent of user code. This allows developers to write code without needing to be aware of infrastructure configuration.
