# A Pluto Application

This is a sample Pluto application.

### Prerequisites

- pulumi
  - You can install it according to the [installation guide](https://www.pulumi.com/docs/install/).
- pluto
  - You can install it with `npm i -g @plutolang/cli`.
- AWS credentials
  - You can configure the credentials by using `aws configure` or setting the environment variables `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_REGION`. More details can be found [here](https://github.com/pluto-lang/pluto).

### Deploy the app

```shell
npm install
pluto deploy
```

### Destroy the app

```shell
pluto destroy
```
