const joi = require('joi')
const bcrypt = require('bcrypt')
const Account = require('../../models/Account')
const {signToken} = require('../../middlewares/jsonwebtoken')

async function register(request, response, next) {
  try {
    // Validate request data
    await joi
      .object({
        username: joi.string().required(),
        password: joi.string().required(),
        role: joi.string().required(),
        cookstyle: joi.when('role', { is: 'user', then: joi.string().valid('Indian', 'Chinese', 'Italian').required() })
      })
      .validateAsync(request.body)
  } catch (error) {
    return response.status(400).json({
      error: 'ValidationError',
      message: error.message,
    })
  }

  try {
    const { username, password, role } = request.body // Include 'role' in destructuring assignment

    // Verify account username as unique
    const existingAccount = await Account.findOne({ username })
    if (existingAccount) {
      return response.status(400).json({
        error: username,
        message: 'An account already exists with that "username"',
      })
    }

    // Encrypt password
    const salt = await bcrypt.genSalt(10)
    const hash = await bcrypt.hash(password, salt)


    let newAccount;
    // Check role and save cookstyle if applicable
    if (role === 'user') {
      const { cookstyle } = request.body;
      // Validate cookstyle value
      await joi
        .string()
        .valid('Indian', 'Chinese', 'Italian')
        .validateAsync(cookstyle);
      newAccount = new Account({ username, password: hash, role, cookstyle });
    } else {
      newAccount = new Account({ username, password: hash, role });
    }

    

    // Save account
    await newAccount.save()

    // Remove password from response data
    newAccount.password = undefined
    delete newAccount.password

    // Generate access token
    const token = signToken({ uid: newAccount._id, role: newAccount.role })

    response.status(201).json({
      message: 'Successfully registered',
      data: newAccount,
      token,
    })
  } catch (error) {
    console.error(error)
    return response.status(500).send()
  }
}

module.exports = register
