PROJECT_NAME=${1-"pulumi-dapr"}
STAGE=${2-staging}

SCRIPT_DIR=$(cd $(dirname $0);pwd)
LANG_ROOT=$(dirname $SCRIPT_DIR)

WORK_DIR=${3-$LANG_ROOT/examples/http-service/_output}
CMD=${4-"destroy"}  # up, destroy

cd $WORK_DIR
if [ "up" = $CMD ]; then
    cp $LANG_ROOT/template/package.json $LANG_ROOT/template/Pulumi.yaml $LANG_ROOT/template/Pulumi.prod.yaml  ./
    sed -i "" "s/%{project_name}/${PROJECT_NAME}/g" ./package.json ./Pulumi.yaml
    mv ./Pulumi.prod.yaml ./Pulumi.$STAGE.yaml

    yarn link @pulumi/dapr
    pulumi stack init --stack $STAGE > /dev/null 2>&1
    pulumi up --stack $STAGE -y -f

elif [ "destroy" = $CMD ]; then
    pulumi down -s $STAGE -y
    pulumi stack rm $STAGE -y
fi