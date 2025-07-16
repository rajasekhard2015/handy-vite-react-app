import { Formik, Form, Field, ErrorMessage } from 'formik';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const signupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignupFormValues = z.infer<typeof signupSchema>;

const SignupForm = () => {
  const { toast } = useToast();

  const initialValues: SignupFormValues = {
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  };

  const validate = (values: SignupFormValues) => {
    try {
      signupSchema.parse(values);
      return {};
    } catch (error) {
      if (error instanceof z.ZodError) {
        return error.errors.reduce((acc, err) => {
          if (err.path[0]) {
            acc[err.path[0] as keyof SignupFormValues] = err.message;
          }
          return acc;
        }, {} as Partial<Record<keyof SignupFormValues, string>>);
      }
      return {};
    }
  };

  const handleSubmit = async (values: SignupFormValues) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Account created successfully!",
        description: "Welcome to our platform.",
      });
      
      console.log('Form submitted:', values);
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
        <CardDescription>Sign up to get started</CardDescription>
      </CardHeader>
      <CardContent>
        <Formik
          initialValues={initialValues}
          validate={validate}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting, isValid }) => (
            <Form className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Field
                    as={Input}
                    id="firstName"
                    name="firstName"
                    type="text"
                    placeholder="John"
                  />
                  <ErrorMessage
                    name="firstName"
                    component="p"
                    className="text-sm text-destructive"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Field
                    as={Input}
                    id="lastName"
                    name="lastName"
                    type="text"
                    placeholder="Doe"
                  />
                  <ErrorMessage
                    name="lastName"
                    component="p"
                    className="text-sm text-destructive"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Field
                  as={Input}
                  id="email"
                  name="email"
                  type="email"
                  placeholder="john@example.com"
                />
                <ErrorMessage
                  name="email"
                  component="p"
                  className="text-sm text-destructive"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Field
                  as={Input}
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                />
                <ErrorMessage
                  name="password"
                  component="p"
                  className="text-sm text-destructive"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Field
                  as={Input}
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                />
                <ErrorMessage
                  name="confirmPassword"
                  component="p"
                  className="text-sm text-destructive"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || !isValid}
              >
                {isSubmitting ? 'Creating Account...' : 'Create Account'}
              </Button>
            </Form>
          )}
        </Formik>
      </CardContent>
    </Card>
  );
};

export default SignupForm;