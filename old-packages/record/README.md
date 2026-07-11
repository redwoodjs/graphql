# RedwoodRecord

RedwoodRecord is an ORM ([Object-Relational Mapping](https://en.wikipedia.org/wiki/Object%E2%80%93relational_mapping)) built on top of Prisma. It may be extended in the future to wrap other database access packages.

RedwoodRecord is heavily inspired by [ActiveRecord](https://guides.rubyonrails.org/active_record_basics.html) which ships with [Ruby on Rails](https://rubyonrails.org). It presents a natural interface to the underlying data in your database, without worry about the particulars of SQL syntax.

## Usage

Usage documentation is available at https://redwoodjs.com/docs/redwoodrecord

## Package Structure

RedwoodRecord is composed of 5 classes total:

1. **Core** - provides core database access for a single model, enabling CRUD actions
2. **Reflection** - parses the Prisma data schema and determines what relations exist to other models
3. **RelationProxy** - provides access to related models reveales by the Reflection class
4. **ValidationMixin** - adds validation support, adding error messages
5. **RedwoodRecord** - combines the functionality of the other four classes into the standard base class that all models should extend from

There is also an `errors.js` file which contains all error messages that RedwoodRecord could throw.

### Tasks

RedwoodRecord depends on reading the Prisma schema file to determine relations to other tables. In order to avoid the `async` wait when parsing the schema with Prisma's built-in function, we have a task which parses the schema file and then saves out a JSON version to the cache `.redwood` directory. This task also creates an `index.js` file in your `api/src/models` directory that imports the models themselves and also adds some configuration to support relations without a circular dependency. The models are then re-exported.

This task is run with:

```
yarn rw record init
```

This task needs to be run whenever you create a new model, or change your database schema in a way that would add/remove a relation to another model.

> We plan to make the task run automatically, watching for changes to your schema.prisma or models directory. But for now you'll need to run it manually!
