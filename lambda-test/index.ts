console.log("print outside hander.")

exports.handler = async (event: any) => {
    console.log(event);
    const response = {
        statusCode: 200,
        body: JSON.stringify('Hello from Lambda!'),
    };
    return response;
};