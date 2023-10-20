# What Problem does Pluto Solve?

Why do we need Pluto? In short, because it's too difficult to make good use of the cloud.

## Too Cumbersome

Let me ask you a question, what percentage of your time is spent on coding when you are developing a business? 80%? 60%? 40%? Or even less? You want to deploy to Kubernetes, but you need to learn Docker, CRD, YAML rules. You want to deploy to a cloud platform, but you get lost in the overwhelming product documentation, jumping and clicking through various pages. Have you ever experienced these situations? Going to the cloud is too troublesome!

## Too Difficult

Of course, to avoid these troubles, you can choose to learn Infrastructure as Code (IaC) tools like Terraform and Pulumi. These tools allow you to describe the desired state of cloud resources in code, and then the tools' engines execute the code to configure the cloud environment. However, using these tools requires you to first learn their basic operations, syntax, and various APIs for interacting with the cloud... Moreover, as the infrastructure becomes increasingly complex, the learning curve of IaC technology becomes higher and the usability becomes more difficult, requiring more and more things to learn.

In addition, the scale of businesses may change, and the budgets may vary. There is no one-size-fits-all architecture for all applications. As an ordinary developer, I lack sufficient experience to design the right cloud architecture for my business scenario, and I also need to ensure that my code is sufficiently scalable and can be easily migrated to a new cloud platform or architecture when my budget is tight or my business scale expands.

## Not Accustomed

There are some user-friendly PaaS platforms and new programming languages that can make my work easier. However, they either simply help me host containers and cannot use lower-cost, faster-starting solutions like FaaS. If I use the components and services they provide, it will also result in tight coupling between my application and their platform. Or they have their own unique programming paradigms, and I need to learn which code should be executed locally and where to write the code that needs to be deployed to the cloud, as well as how to write it. This approach makes it difficult for me to focus on business logic and hinders innovation.

Is there no way to allow me to write code in my usual way of thinking without having to learn new technologies, and still be able to easily use the rich capabilities of the cloud? This is exactly what Pluto wants to try to achieve, allowing developers to truly focus on writing business code and leaving everything else to Pluto.

## Pluto Philosophy

We believe that a cloud tool should not force developers to adopt any specific way of writing applications, but should be integrated into the user's workflow as an extension, reducing the burden of going to the cloud for users.

However, currently, various cloud technologies and products force developers to write applications in the specific ways they provide, such as putting FaaS functions in designated directories or forcibly integrating compile-time and runtime code into the developer's programming interface. This requires developers to distinguish which code is executed on the cloud and which is executed on-premises while programming. These "new" programming approaches differ greatly from developers' previous programming mindset and greatly affect their programming habits.

Therefore, the goal of Pluto is to provide developers with a pure business programming interface that is consistent with their usual coding practices, enabling developers to truly focus on business logic without having to worry about anything related to infrastructure (although infrastructure can be configured when needed). At the same time, all tasks other than writing code are completely automated by Pluto, including testing, compiling, and deploying.

If you have similar painful experiences, or if you are interested in this idea💡, or if you have a scenario that needs it, please feel free to contact us and let's do something interesting together!
